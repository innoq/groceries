/* eslint-env worker, es2020 */
/* global EventSource */
import * as Automerge from "https://cdn.skypack.dev/automerge";

class List {
	constructor() {
		this.state = undefined;
		this.listeners = [];
		this.changes = [];
		this.pendingChanges = [];
		this.interval = setInterval(this.pushChanges.bind(this), 1000);
	}

	applyChanges(data) {
		const change = decode(data);
		let [newDoc] = Automerge.applyChanges(this.state, [change]);
		this.state = newDoc;
		this.publish();
	}

	load(fullList) {
		this.state = Automerge.load(decode(fullList));
		for (const change of this.pendingChanges) {
			this.change(change);
		}
		this.pendingChanges = [];
		this.publish();
	}

	subscribe(fn) {
		this.listeners.push(fn);
		if (this.state) {
			fn(this.state);
		}
	}

	publish() {
		for (const listener of this.listeners) {
			listener(this.state);
		}
	}

	async pushChanges() {
		if (this.changes.length > 0) {
			try {
				await fetch("/foo", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						changes: this.changes,
					}),
				});
				this.changes = [];
			} catch (e) {
				console.log("failed");
			}
		}
	}

	change(fn) {
		if (this.state) {
			const newState = Automerge.change(this.state, fn);
			const changes = Automerge.getChanges(this.state, newState).map(encode);
			this.changes = [...this.changes, ...changes];
			this.state = newState;
			this.publish();
		} else {
			this.pendingChanges.push(fn);
		}
	}
}

let list = new List();

addEventListener("connect", (ev) => {
	const port = ev.ports[0];
	port.start();

	list.subscribe((data) => {
		port.postMessage({
			type: "update",
			data,
		});
	});

	port.addEventListener("message", ({ data }) => {
		if (data.type === "addItem") {
			list.change((snapshot) => {
				snapshot.todos.push({
					text: data.text,
					done: false,
				});
			});
		}
	});
});

(async () => {
	const initial = await fetch("/current");
	list.load(await initial.text());

	const source = new EventSource("/stream");
	source.addEventListener("message", (ev) => {
		list.applyChanges(ev.data);
	});
})().catch((err) => {
	console.error(err);
});

// TODO: Can we just use TextEncoder and TextDecoder on both sites?
// decode a base64 encoded string to a Uint8Array
const decode = (base64) => {
	let binary = globalThis.atob(base64);
	let len = binary.length;
	let bytes = new Uint8Array(len);
	for (let i = 0; i < len; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
};

function encode(uint) {
	return globalThis.btoa(String.fromCharCode.apply(null, uint));
}

/* eslint-env browser */
import * as Automerge from "https://cdn.skypack.dev/automerge";

class AutomergeList extends HTMLElement {
	constructor() {
		super();
		this.changes = [];
		this.online = true;
		this.interval = setInterval(this.pushChanges.bind(this), 1000);
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

	connectedCallback() {
		this.ul = this.querySelector("ul");
		this.form = this.querySelector("form");
		const initial = this.getAttribute("initial");
		this.state = Automerge.load(decode(initial));
		this.source = new EventSource(this.getAttribute("change-feed"));
		this.onMessage = this.onMessage.bind(this);
		this.source.addEventListener("message", this.onMessage);
		this.form.addEventListener("submit", this.onSubmit.bind(this));
		this.button = document.createElement("button");
		this.button.innerText = "Go offline";
		this.button.addEventListener("click", this.toggleOnline.bind(this));
		this.appendChild(this.button);
	}

	renderList() {
		this.ul.innerHTML = "";
		for (const todo of this.state.todos) {
			const li = document.createElement("li");
			li.textContent = todo.text;
			this.ul.appendChild(li);
		}
	}

	change(fn) {
		const newState = Automerge.change(this.state, fn);
		const changes = Automerge.getChanges(this.state, newState).map(encode);
		this.changes = [...this.changes, ...changes];
		this.state = newState;
		this.renderList();
	}

	onMessage(ev) {
		const change = decode(ev.data);
		let [newDoc] = Automerge.applyChanges(this.state, [change]);
		this.state = newDoc;
		this.renderList();
	}

	onSubmit(ev) {
		const text = this.form.querySelector("[name=text]").value;
		this.form.querySelector("[name=text]").value = "";
		this.change((doc) => {
			doc.todos.push({
				text,
				done: false,
			});
		});
		ev.preventDefault();
	}

	toggleOnline() {
		if (this.online) {
			clearInterval(this.interval);
			this.source.removeEventListener("message", this.onMessage);
			this.source.close();
			this.button.innerText = "Go online";
		} else {
			this.interval = setInterval(this.pushChanges.bind(this), 1000);
			this.source = new EventSource(this.getAttribute("change-feed"));
			this.source.addEventListener("message", this.onMessage);
			this.button.innerText = "Go offline";
		}
		this.online = !this.online;
	}
}

customElements.define("automerge-list", AutomergeList);

// TODO: Can we just use TextEncoder and TextDecoder on both sites?
// decode a base64 encoded string to a Uint8Array
function decode(base64) {
	let binary = window.atob(base64);
	let len = binary.length;
	let bytes = new Uint8Array(len);
	for (let i = 0; i < len; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

function encode(uint) {
	return window.btoa(String.fromCharCode.apply(null, uint));
}

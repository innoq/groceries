/* eslint-env node */
import * as Automerge from "automerge";
import { EventEmitter } from "events";

// TODO: universal?
export class List {
	// TODO: restore from backup?
	constructor() {
		this.state = Automerge.from({ todos: [] });
		this.changes = [];
		this.emitter = new EventEmitter();
	}

	add(text) {
		const newState = Automerge.change(this.state, `Add ${text}`, (doc) => {
			doc.todos.push({
				text: text,
				done: false,
			});
		});
		const changes = Automerge.getChanges(this.state, newState);
		this.emitChanges(changes);
		this.state = newState;
	}

	all() {
		return this.state.todos;
	}

	allAsAutomerge() {
		let backup = Automerge.save(this.state);
		return Buffer.from(backup).toString("base64");
	}

	apply(data) {
		let changes = data.map((change) => {
			return new Uint8Array(Buffer.from(change, "base64"));
		});
		let [newDoc] = Automerge.applyChanges(this.state, changes);
		this.state = newDoc;
		this.emitChanges(changes);
	}

	onChange(fn) {
		this.changes.forEach((change) => {
			fn({ change });
		});
		this.emitter.on("change", fn);
	}

	emitChanges(changes) {
		changes = changes.map((change) => Buffer.from(change).toString("base64"));
		this.changes = [...this.changes, ...changes];
		changes.forEach((change) => {
			this.emitter.emit("change", {
				change,
			});
		});
	}
}

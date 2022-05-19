/* eslint-env browser, es2020 */
class AutomergeList extends HTMLElement {
	connectedCallback() {
		this.worker = new globalThis.SharedWorker("/worker.js", {
			name: "Sync Worker",
			type: "module",
		});
		this.worker.port.start();
		this.worker.port.addEventListener("message", this.onMessage.bind(this));

		this.form = this.querySelector("form");
		this.form.addEventListener("submit", this.onSubmit.bind(this));
		this.ul = this.querySelector("ul");
	}

	renderList(todos) {
		this.ul.innerHTML = "";
		for (const todo of todos) {
			const li = document.createElement("li");
			li.textContent = todo.text;
			this.ul.appendChild(li);
		}
	}

	onMessage({ data }) {
		if (data.type === "update") {
			this.renderList(data.data.todos);
		}
	}

	onSubmit(ev) {
		const text = this.form.querySelector("[name=text]").value;
		this.form.querySelector("[name=text]").value = "";
		this.worker.port.postMessage({
			type: "addItem",
			text,
		});
		ev.preventDefault();
	}
}

if (globalThis.SharedWorker) {
	customElements.define("automerge-list", AutomergeList);
}

/* eslint-env node */
import { fastify } from "fastify";
import * as pov from "point-of-view";
import * as pug from "pug";
import * as formbody from "fastify-formbody";
import * as fastifyStatic from "fastify-static";
import { resolve } from "path";
import { List } from "./list.js";

const list = new List();

const app = fastify({ logger: true });

app.register(pov, {
	engine: {
		pug,
	},
});

// TODO https://github.com/fastify/fastify-accepts

app.register(formbody);

app.register(fastifyStatic, {
	root: resolve("static"),
});

app.get("/", async (request, reply) => {
	if (request.headers.accept === "application/vnd.automerge") {
		return reply.send(list.allAsAutomerge());
	}

	return reply.view("templates/index.pug", {
		todos: list.all(),
	});
});

app.post("/", async (request, reply) => {
	if (request.body.changes) {
		list.apply(request.body.changes);
	} else {
		list.add(request.body.text);
	}

	reply.redirect("/");
});

app.get("/stream", (request, reply) => {
	reply.raw.writeHead(200, {
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache",
	});
	reply.raw.write("\n");
	let id = 0;

	list.onChange((ev) => {
		reply.raw.write(`id: ${id++}\n`);
		reply.raw.write(`data: ${ev.change} \n\n`);
	});
});

const start = async () => {
	try {
		await app.listen(3000, "0.0.0.0");
	} catch (err) {
		app.log.error(err);
		process.exit(1);
	}
};
start();

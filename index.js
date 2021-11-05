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

app.register(formbody);

app.register(fastifyStatic, {
	root: resolve("static"),
});

app.get("/", async (request, reply) => {
	return reply.view("templates/index.pug", {
		todos: list.all(),
		initial: list.backup(),
		feedURL: "/stream",
		addURL: "/",
	});
});

app.post("/", async (request, reply) => {
	list.add(request.body.text);
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

app.post("/foo", async (request, reply) => {
	let changes = request.body.changes.map((change) => {
		return new Uint8Array(Buffer.from(change, "base64"));
	});
	list.apply(changes);
	reply.send("ok");
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

import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { buildCorsOptions, corsOriginsSchema } from "../src/config/cors.js";

async function buildTestApp(origins: string[]) {
	const app = Fastify();
	await app.register(cors, buildCorsOptions(origins));
	app.get("/health", async () => ({ status: "ok" }));
	return app;
}

test("CORS_ORIGINS parses a comma-separated list of origins", () => {
	assert.deepEqual(
		corsOriginsSchema.parse(" http://localhost:5173 , https://catalogo.exemplo.com "),
		["http://localhost:5173", "https://catalogo.exemplo.com"],
	);
	assert.deepEqual(corsOriginsSchema.parse(""), []);
});

test("CORS_ORIGINS rejects paths, trailing slashes, wildcards and other protocols", () => {
	for (const value of [
		"http://localhost:5173/",
		"http://localhost:5173/app",
		"*",
		"ftp://localhost",
		"localhost:5173",
	]) {
		assert.equal(corsOriginsSchema.safeParse(value).success, false, value);
	}
});

test("allowed origin receives CORS headers, including preflight", async (t) => {
	const app = await buildTestApp(["http://localhost:5173"]);
	t.after(() => app.close());

	const simple = await app.inject({
		method: "GET", url: "/health",
		headers: { origin: "http://localhost:5173" },
	});
	assert.equal(simple.headers["access-control-allow-origin"], "http://localhost:5173");

	const preflight = await app.inject({
		method: "OPTIONS", url: "/health",
		headers: {
			origin: "http://localhost:5173",
			"access-control-request-method": "GET",
		},
	});
	assert.equal(preflight.statusCode, 204);
	assert.equal(preflight.headers["access-control-allow-origin"], "http://localhost:5173");
});

test("unlisted origin does not receive CORS headers", async (t) => {
	const app = await buildTestApp(["http://localhost:5173"]);
	t.after(() => app.close());

	const response = await app.inject({
		method: "GET", url: "/health",
		headers: { origin: "https://malicioso.exemplo.com" },
	});
	assert.equal(response.headers["access-control-allow-origin"], undefined);
	assert.deepEqual(response.json(), { status: "ok" });
});

test("allowed origin may send credentials (cookies)", async (t) => {
	const app = await buildTestApp(["http://localhost:5173"]);
	t.after(() => app.close());

	const response = await app.inject({
		method: "GET", url: "/health",
		headers: { origin: "http://localhost:5173" },
	});
	assert.equal(response.headers["access-control-allow-credentials"], "true");
});

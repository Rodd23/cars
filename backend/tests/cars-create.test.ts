import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { carCreateRoutes } from "../src/modules/cars/cars-write.routes.js";
import { createCarSchema, type CreateCarInput } from "../src/modules/cars/cars.schema.js";
import { hashPassword } from "../src/modules/auth/password.js";
import { ALLOWED_ORIGIN, FakeAuthRepository, buildAuth } from "./helpers/fake-auth.js";

const validBody = {
	brand: "Fiat", model: "Uno", year: 2020, price: 50000,
	fuel: "Flex", transmission: "Manual", mileage: 1000,
};

async function setup(createCar: (data: CreateCarInput) => Promise<unknown[]>) {
	const authRepo = new FakeAuthRepository();
	authRepo.users.push({
		id: "user-1", email: "ana@empresa.com", name: "Ana",
		passwordHash: await hashPassword("senha-correta-123"), disabledAt: null,
	});
	const { service, guard } = buildAuth(authRepo);
	const login = await service.login("ana@empresa.com", "senha-correta-123");
	const app = Fastify();
	await app.register(cookie);
	await app.register(carCreateRoutes, { repository: { createCar }, guard });
	return { app, sid: login!.token };
}

test("AC5: POST /cars without a session is 401 and never reaches the repository", async (t) => {
	let calls = 0;
	const { app } = await setup(async () => { calls++; return []; });
	t.after(() => app.close());
	for (const cookies of [undefined, { sid: "invalido" }]) {
		const response = await app.inject({
			method: "POST", url: "/cars", payload: validBody, ...(cookies ? { cookies } : {}),
		});
		assert.equal(response.statusCode, 401);
		assert.deepEqual(response.json(), { error: "Unauthorized" });
	}
	assert.equal(calls, 0);
});

test("AC5/AC6: with a session (and no or allowed Origin) POST /cars returns 201 with the created car", async (t) => {
	const created = { id: "abc", ...validBody, price: "50000.00", version: null };
	let received: CreateCarInput | undefined;
	const { app, sid } = await setup(async (data) => { received = data; return [created]; });
	t.after(() => app.close());
	for (const headers of [{}, { origin: ALLOWED_ORIGIN }]) {
		const response = await app.inject({
			method: "POST", url: "/cars", cookies: { sid }, headers, payload: validBody,
		});
		assert.equal(response.statusCode, 201);
		assert.deepEqual(response.json(), created);
	}
	assert.deepEqual(received, validBody);
});

test("AC6: POST /cars with an unlisted Origin is 403 and never reaches the repository", async (t) => {
	let calls = 0;
	const { app, sid } = await setup(async () => { calls++; return []; });
	t.after(() => app.close());
	const response = await app.inject({
		method: "POST", url: "/cars", cookies: { sid },
		headers: { origin: "https://malicioso.exemplo.com" }, payload: validBody,
	});
	assert.equal(response.statusCode, 403);
	assert.equal(calls, 0);
});

test("AC7: invalid fields return 400 with details[].path and no DB call", async (t) => {
	let calls = 0;
	const { app, sid } = await setup(async () => { calls++; return []; });
	t.after(() => app.close());
	const nextYear = new Date().getFullYear() + 1;
	const cases: Array<[Record<string, unknown>, string]> = [
		[{ brand: "x".repeat(81) }, "brand"],
		[{ model: "x".repeat(121) }, "model"],
		[{ version: "x".repeat(121) }, "version"],
		[{ fuel: "x".repeat(31) }, "fuel"],
		[{ transmission: "x".repeat(31) }, "transmission"],
		[{ brand: "   " }, "brand"],
		[{ imageUrl: `https://exemplo.com/${"x".repeat(2048)}` }, "imageUrl"],
		[{ imageUrl: "ftp://exemplo.com/a.png" }, "imageUrl"],
		[{ imageUrl: "javascript:alert(1)" }, "imageUrl"],
		[{ year: 1885 }, "year"],
		[{ year: nextYear + 1 }, "year"],
		[{ price: 0 }, "price"],
		[{ price: 10_000_000_000 }, "price"],
		[{ price: 10.5 }, "price"],
		[{ mileage: -1 }, "mileage"],
		[{ mileage: 2_000_001 }, "mileage"],
	];
	for (const [override, path] of cases) {
		const response = await app.inject({
			method: "POST", url: "/cars", cookies: { sid }, payload: { ...validBody, ...override },
		});
		assert.equal(response.statusCode, 400, JSON.stringify(override).slice(0, 80));
		const body = response.json();
		assert.equal(body.error, "Validation error");
		assert.ok(body.details.length > 0);
		assert.ok(body.details.some((d: { path: string; message: string }) => d.path === path && d.message), path);
	}
	assert.equal(calls, 0);

	const missing = await app.inject({ method: "POST", url: "/cars", cookies: { sid }, payload: {} });
	assert.equal(missing.statusCode, 400);
	assert.ok(missing.json().details.length >= 7);
});

test("boundary values are accepted and texts are trimmed", () => {
	const nextYear = new Date().getFullYear() + 1;
	const parsed = createCarSchema.parse({
		brand: "  Fiat  ", model: "x".repeat(120), year: nextYear, price: 9_999_999_999,
		fuel: "f".repeat(30), transmission: " Manual ", mileage: 2_000_000,
		imageUrl: " https://exemplo.com/a.png ",
	});
	assert.equal(parsed.brand, "Fiat");
	assert.equal(parsed.transmission, "Manual");
	assert.equal(parsed.imageUrl, "https://exemplo.com/a.png");
	assert.equal(createCarSchema.safeParse({ ...validBody, year: 1886, mileage: 0 }).success, true);
});

test("AC7: 500 does not expose the internal error message", async (t) => {
	const { app, sid } = await setup(async () => {
		throw new Error("Database error: connection refused to secret-host");
	});
	t.after(() => app.close());
	const response = await app.inject({
		method: "POST", url: "/cars", cookies: { sid }, payload: validBody,
	});
	assert.equal(response.statusCode, 500);
	assert.deepEqual(response.json(), { error: "Failed to create car" });
	assert.ok(!response.body.includes("secret-host"));
});

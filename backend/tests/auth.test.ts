import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { hashPassword } from "../src/modules/auth/password.js";
import { ALLOWED_ORIGIN, FakeAuthRepository, buildAuthApp, sidFrom } from "./helpers/fake-auth.js";

const PASSWORD = "senha-correta-123";
const credentials = { email: "ana@empresa.com", password: PASSWORD };

async function seed(overrides: { disabledAt?: Date } = {}) {
	const repo = new FakeAuthRepository();
	repo.users.push({
		id: "user-1", email: "ana@empresa.com", name: "Ana",
		passwordHash: await hashPassword(PASSWORD),
		disabledAt: overrides.disabledAt ?? null,
	});
	return repo;
}

async function login(app: Awaited<ReturnType<typeof buildAuthApp>>["app"]) {
	return app.inject({ method: "POST", url: "/auth/login", payload: credentials });
}

test("AC1: login sets an HttpOnly Lax cookie and stores only the token hash", async (t) => {
	const repo = await seed();
	const { app } = await buildAuthApp(repo);
	t.after(() => app.close());
	const response = await app.inject({
		method: "POST", url: "/auth/login",
		payload: { email: "  ANA@Empresa.com ", password: PASSWORD },
	});
	assert.equal(response.statusCode, 200);
	assert.deepEqual(response.json(), { user: { id: "user-1", email: "ana@empresa.com", name: "Ana" } });
	const setCookie = String(response.headers["set-cookie"]);
	assert.match(setCookie, /HttpOnly/i);
	assert.match(setCookie, /SameSite=Lax/i);
	assert.match(setCookie, /Path=\//);
	assert.match(setCookie, /Max-Age=28800/);
	assert.doesNotMatch(setCookie, /Secure/i);
	const token = sidFrom(response.headers["set-cookie"]);
	assert.ok(token.length >= 43);
	assert.equal(repo.sessions.length, 1);
	assert.equal(repo.sessions[0]!.id, createHash("sha256").update(token).digest("hex"));
	assert.notEqual(repo.sessions[0]!.id, token);
});

test("login validates the body with details", async (t) => {
	const { app } = await buildAuthApp(await seed());
	t.after(() => app.close());
	const response = await app.inject({
		method: "POST", url: "/auth/login", payload: { email: "nao-e-email", password: "" },
	});
	assert.equal(response.statusCode, 400);
	const paths = response.json().details.map((d: { path: string }) => d.path).sort();
	assert.deepEqual(paths, ["email", "password"]);
});

test("AC2: unknown email, wrong password and disabled user get the same 401", async (t) => {
	const bodies: string[] = [];
	for (const [repo, payload] of [
		[await seed(), { email: "ninguem@empresa.com", password: PASSWORD }],
		[await seed(), { email: "ana@empresa.com", password: "senha-errada-123" }],
		[await seed({ disabledAt: new Date() }), credentials],
	] as const) {
		const { app } = await buildAuthApp(repo);
		t.after(() => app.close());
		const response = await app.inject({ method: "POST", url: "/auth/login", payload });
		assert.equal(response.statusCode, 401);
		assert.equal(response.headers["set-cookie"], undefined);
		assert.equal(repo.sessions.length, 0);
		bodies.push(response.body);
	}
	assert.deepEqual(bodies, Array(3).fill('{"error":"Invalid credentials"}'));
});

test("AC3: /auth/me works with a session and is 401 without cookie, unknown cookie or expired session", async (t) => {
	let now = new Date("2026-01-01T00:00:00Z");
	const repo = await seed();
	const { app } = await buildAuthApp(repo, { now: () => now });
	t.after(() => app.close());

	const logged = await login(app);
	const sid = sidFrom(logged.headers["set-cookie"]);
	const ok = await app.inject({ method: "GET", url: "/auth/me", cookies: { sid } });
	assert.equal(ok.statusCode, 200);
	assert.deepEqual(ok.json().user, { id: "user-1", email: "ana@empresa.com", name: "Ana" });

	for (const cookies of [undefined, { sid: "desconhecido" }]) {
		const response = await app.inject({ method: "GET", url: "/auth/me", ...(cookies ? { cookies } : {}) });
		assert.equal(response.statusCode, 401);
		assert.deepEqual(response.json(), { error: "Unauthorized" });
	}

	now = new Date("2026-01-01T08:00:01Z");
	const expired = await app.inject({ method: "GET", url: "/auth/me", cookies: { sid } });
	assert.equal(expired.statusCode, 401);
	assert.equal(repo.sessions.length, 0);
});

test("a user disabled after login loses the session; login purges the user's expired sessions", async (t) => {
	let now = new Date("2026-01-01T00:00:00Z");
	const repo = await seed();
	const { app } = await buildAuthApp(repo, { now: () => now });
	t.after(() => app.close());
	const first = sidFrom((await login(app)).headers["set-cookie"]);

	now = new Date("2026-01-01T09:00:00Z");
	await login(app);
	assert.equal(repo.sessions.length, 1, "expired session removed on login");

	const sid = sidFrom((await login(app)).headers["set-cookie"]);
	repo.users[0]!.disabledAt = new Date();
	const response = await app.inject({ method: "GET", url: "/auth/me", cookies: { sid } });
	assert.equal(response.statusCode, 401);
	assert.ok(first);
});

test("AC4: logout is 204, idempotent, deletes the session and clears the cookie", async (t) => {
	const repo = await seed();
	const { app } = await buildAuthApp(repo);
	t.after(() => app.close());
	const sid = sidFrom((await login(app)).headers["set-cookie"]);

	const first = await app.inject({ method: "POST", url: "/auth/logout", cookies: { sid } });
	assert.equal(first.statusCode, 204);
	assert.equal(repo.sessions.length, 0);
	assert.match(String(first.headers["set-cookie"]), /sid=;/);
	assert.match(String(first.headers["set-cookie"]), /Expires=Thu, 01 Jan 1970|Max-Age=0/);

	const again = await app.inject({ method: "POST", url: "/auth/logout", cookies: { sid } });
	assert.equal(again.statusCode, 204);
	const anonymous = await app.inject({ method: "POST", url: "/auth/logout" });
	assert.equal(anonymous.statusCode, 204);
	const me = await app.inject({ method: "GET", url: "/auth/me", cookies: { sid } });
	assert.equal(me.statusCode, 401);
});

test("logout rejects an unlisted Origin with 403 and keeps the session", async (t) => {
	const repo = await seed();
	const { app } = await buildAuthApp(repo);
	t.after(() => app.close());
	const sid = sidFrom((await login(app)).headers["set-cookie"]);
	const bad = await app.inject({
		method: "POST", url: "/auth/logout", cookies: { sid },
		headers: { origin: "https://malicioso.exemplo.com" },
	});
	assert.equal(bad.statusCode, 403);
	assert.equal(repo.sessions.length, 1);
	const good = await app.inject({
		method: "POST", url: "/auth/logout", cookies: { sid }, headers: { origin: ALLOWED_ORIGIN },
	});
	assert.equal(good.statusCode, 204);
});

test("AC8: login is rate limited per IP after too many attempts", async (t) => {
	const { app } = await buildAuthApp(await seed(), { loginMaxAttempts: 3 });
	t.after(() => app.close());
	const statuses: number[] = [];
	for (let i = 0; i < 5; i++) {
		const response = await app.inject({
			method: "POST", url: "/auth/login",
			payload: { email: "ana@empresa.com", password: "senha-errada-123" },
		});
		statuses.push(response.statusCode);
	}
	assert.deepEqual(statuses, [401, 401, 401, 429, 429]);
	const me = await app.inject({ method: "GET", url: "/auth/me" });
	assert.equal(me.statusCode, 401, "other routes are not limited");
});

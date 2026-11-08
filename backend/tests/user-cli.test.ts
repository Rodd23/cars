import assert from "node:assert/strict";
import test from "node:test";
import { runUserCommand, UserCommandError } from "../src/modules/auth/user-admin.js";
import { verifyPassword } from "../src/modules/auth/password.js";
import { FakeAuthRepository } from "./helpers/fake-auth.js";

function reader(...answers: string[]) {
	const queue = [...answers];
	return async () => queue.shift() ?? "";
}

const PASSWORD = "senha-com-12-chars";

test("AC10: creates a user with a scrypt hash and normalized email", async () => {
	const repository = new FakeAuthRepository();
	const message = await runUserCommand(
		{ email: " Ana@Empresa.com ", name: " Ana ", resetPassword: false },
		{ repository, readPassword: reader(PASSWORD, PASSWORD) },
	);
	assert.equal(repository.users.length, 1);
	const user = repository.users[0]!;
	assert.equal(user.email, "ana@empresa.com");
	assert.equal(user.name, "Ana");
	assert.equal(await verifyPassword(PASSWORD, user.passwordHash), true);
	assert.ok(!message.includes(PASSWORD) && !message.includes(user.passwordHash));
});

test("AC10: rejects short password, mismatched confirmation and missing name without creating", async () => {
	for (const [answers, name] of [
		[["curta", "curta"], "Ana"],
		[[PASSWORD, "outra-senha-longa"], "Ana"],
		[[PASSWORD, PASSWORD], ""],
	] as const) {
		const repository = new FakeAuthRepository();
		await assert.rejects(
			runUserCommand(
				{ email: "ana@empresa.com", name, resetPassword: false },
				{ repository, readPassword: reader(...answers) },
			),
			UserCommandError,
		);
		assert.equal(repository.users.length, 0);
	}
});

test("AC10: duplicate email fails without changing the existing user", async () => {
	const repository = new FakeAuthRepository();
	repository.users.push({
		id: "u1", email: "ana@empresa.com", name: "Ana", passwordHash: "hash-original", disabledAt: null,
	});
	await assert.rejects(
		runUserCommand(
			{ email: "ana@empresa.com", name: "Outra", resetPassword: false },
			{ repository, readPassword: reader(PASSWORD, PASSWORD) },
		),
		/already exists/,
	);
	assert.equal(repository.users.length, 1);
	assert.equal(repository.users[0]!.passwordHash, "hash-original");
	assert.equal(repository.users[0]!.name, "Ana");
});

test("AC10: --reset-password changes the hash and revokes sessions; unknown user fails", async () => {
	const repository = new FakeAuthRepository();
	repository.users.push({
		id: "u1", email: "ana@empresa.com", name: "Ana", passwordHash: "hash-original", disabledAt: null,
	});
	repository.sessions.push(
		{ id: "s1", userId: "u1", expiresAt: new Date("2030-01-01") },
		{ id: "s2", userId: "u2", expiresAt: new Date("2030-01-01") },
	);
	await runUserCommand(
		{ email: "ana@empresa.com", resetPassword: true },
		{ repository, readPassword: reader(PASSWORD, PASSWORD) },
	);
	assert.notEqual(repository.users[0]!.passwordHash, "hash-original");
	assert.equal(await verifyPassword(PASSWORD, repository.users[0]!.passwordHash), true);
	assert.deepEqual(repository.sessions.map((s) => s.id), ["s2"]);

	await assert.rejects(
		runUserCommand(
			{ email: "nao@empresa.com", resetPassword: true },
			{ repository, readPassword: reader(PASSWORD, PASSWORD) },
		),
		/not found/,
	);
});

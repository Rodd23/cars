import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, verifyPassword } from "../src/modules/auth/password.js";

test("AC9: scrypt hash verifies the right password, rejects the wrong one and uses unique salts", async () => {
	const first = await hashPassword("uma-senha-longa-1");
	const second = await hashPassword("uma-senha-longa-1");
	assert.match(first, /^scrypt\$32768\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
	assert.notEqual(first, second);
	assert.equal(await verifyPassword("uma-senha-longa-1", first), true);
	assert.equal(await verifyPassword("uma-senha-longa-2", first), false);
});

test("malformed stored hashes never verify", async () => {
	for (const stored of ["", "bcrypt$x", "scrypt$1$2$3$a$b", "scrypt$abc$8$1$AAAA$AAAA", "scrypt$32768$8$1$$"]) {
		assert.equal(await verifyPassword("qualquer", stored), false, stored);
	}
});

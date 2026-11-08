import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const N = 2 ** 15;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
// scrypt needs about 128 * N * r bytes (32 MB for N=2^15); the default limit is 32 MB.
const MAXMEM = 64 * 1024 * 1024;

function derive(
	password: string,
	salt: Buffer,
	n: number,
	r: number,
	p: number,
	keyLength: number,
): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		scrypt(
			password.normalize("NFKC"),
			salt,
			keyLength,
			{ N: n, r, p, maxmem: MAXMEM },
			(error, key) => (error ? reject(error) : resolve(key)),
		);
	});
}

// Format: scrypt$N$r$p$salt$hash (salt and hash in base64).
export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(SALT_LENGTH);
	const key = await derive(password, salt, N, R, P, KEY_LENGTH);
	return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(
	password: string,
	stored: string,
): Promise<boolean> {
	const parts = stored.split("$");
	if (parts.length !== 6 || parts[0] !== "scrypt") return false;
	const [, nText, rText, pText, saltText, hashText] = parts as [
		string, string, string, string, string, string,
	];
	const n = Number(nText);
	const r = Number(rText);
	const p = Number(pText);
	if (
		!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p) ||
		n < 2 || n > N || (n & (n - 1)) !== 0 || r < 1 || r > 16 || p < 1 || p > 4
	) {
		return false;
	}
	const salt = Buffer.from(saltText, "base64");
	const expected = Buffer.from(hashText, "base64");
	if (salt.length === 0 || expected.length === 0) return false;
	try {
		const actual = await derive(password, salt, n, r, p, expected.length);
		return timingSafeEqual(actual, expected);
	} catch {
		return false;
	}
}

import "dotenv/config";
import { parseArgs } from "node:util";
import { createDb } from "../db/create-db.js";
import { DrizzleAuthRepository } from "../modules/auth/auth.repository.js";
import { runUserCommand, UserCommandError } from "../modules/auth/user-admin.js";

const USAGE =
	'Usage: npm run user:create -- --email <email> --name "<name>" [--reset-password]';

// Reads a line without echo from the TTY; without a TTY, reads the first line of stdin.
function createPasswordReader() {
	let piped: Promise<string> | undefined;

	function readPiped() {
		piped ??= new Promise<string>((resolve, reject) => {
			let data = "";
			process.stdin.setEncoding("utf8");
			process.stdin.on("data", (chunk) => (data += chunk));
			process.stdin.on("error", reject);
			process.stdin.on("end", () => resolve(data.split(/\r?\n/)[0] ?? ""));
		});
		return piped;
	}

	function readHidden(prompt: string) {
		return new Promise<string>((resolve, reject) => {
			const stdin = process.stdin;
			process.stderr.write(prompt);
			stdin.setRawMode(true);
			stdin.resume();
			stdin.setEncoding("utf8");
			let value = "";
			const finish = () => {
				stdin.setRawMode(false);
				stdin.pause();
				stdin.off("data", onData);
				process.stderr.write("\n");
			};
			const onData = (chunk: string) => {
				for (const char of chunk) {
					if (char === "\r" || char === "\n") {
						finish();
						return resolve(value);
					}
					if (char === "\u0003") {
						finish();
						return reject(new UserCommandError("Cancelled"));
					}
					if (char === "\u007f" || char === "\b") {
						value = value.slice(0, -1);
					} else {
						value += char;
					}
				}
			};
			stdin.on("data", onData);
		});
	}

	return (prompt: string) => (process.stdin.isTTY ? readHidden(prompt) : readPiped());
}

async function main() {
	const { values } = parseArgs({
		options: {
			email: { type: "string" },
			name: { type: "string" },
			"reset-password": { type: "boolean", default: false },
		},
	});
	if (!values.email) {
		throw new UserCommandError(USAGE);
	}
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		throw new UserCommandError("DATABASE_URL is required");
	}

	const { pool, db } = createDb(databaseUrl);
	try {
		const message = await runUserCommand(
			{
				email: values.email,
				name: values.name,
				resetPassword: values["reset-password"] ?? false,
			},
			{
				repository: new DrizzleAuthRepository(db),
				readPassword: createPasswordReader(),
			},
		);
		console.log(message);
	} finally {
		await pool.end();
	}
}

main().catch((error) => {
	if (error instanceof UserCommandError) {
		console.error(`Error: ${error.message}`);
	} else {
		// Unexpected failures (e.g. database): print only the message, never secrets.
		console.error("Error:", error instanceof Error ? error.message : "unexpected failure");
	}
	process.exit(1);
});

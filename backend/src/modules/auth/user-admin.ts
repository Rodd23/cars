import { emailSchema } from "./auth.schema.js";
import type { AuthRepository } from "./auth.service.js";
import { hashPassword } from "./password.js";

export const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 1024;

export class UserCommandError extends Error {}

export type UserAdminRepository = Pick<
	AuthRepository,
	"findUserByEmail" | "createUser" | "updatePassword" | "deleteSessionsByUser"
>;

export interface UserCommandOptions {
	email: string;
	name?: string | undefined;
	resetPassword: boolean;
}

// Creates a user or, with resetPassword, replaces the password and drops sessions.
// Never returns or logs the password or its hash.
export async function runUserCommand(
	options: UserCommandOptions,
	deps: {
		repository: UserAdminRepository;
		readPassword: (prompt: string) => Promise<string>;
	},
): Promise<string> {
	const email = emailSchema.safeParse(options.email);
	if (!email.success) throw new UserCommandError("Invalid email");

	const name = options.name?.trim() ?? "";
	if (!options.resetPassword && (name.length === 0 || name.length > 120)) {
		throw new UserCommandError("--name is required (1 to 120 characters)");
	}

	const existing = await deps.repository.findUserByEmail(email.data);
	if (options.resetPassword && !existing) {
		throw new UserCommandError("User not found");
	}
	if (!options.resetPassword && existing) {
		throw new UserCommandError("A user with this email already exists");
	}

	const password = await deps.readPassword("Password: ");
	if (password.length < MIN_PASSWORD_LENGTH) {
		throw new UserCommandError(
			`Password must have at least ${MIN_PASSWORD_LENGTH} characters`,
		);
	}
	if (password.length > MAX_PASSWORD_LENGTH) {
		throw new UserCommandError(
			`Password must have at most ${MAX_PASSWORD_LENGTH} characters`,
		);
	}
	const confirmation = await deps.readPassword("Confirm password: ");
	if (confirmation !== password) {
		throw new UserCommandError("Passwords do not match");
	}

	const passwordHash = await hashPassword(password);
	if (existing) {
		await deps.repository.updatePassword(existing.id, passwordHash);
		await deps.repository.deleteSessionsByUser(existing.id);
		return `Password reset for ${email.data}; sessions revoked`;
	}
	await deps.repository.createUser({ email: email.data, name, passwordHash });
	return `User ${email.data} created`;
}

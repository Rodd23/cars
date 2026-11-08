import { createHash, randomBytes } from "node:crypto";
import { hashPassword, verifyPassword } from "./password.js";

export interface AuthUserRecord {
	id: string;
	email: string;
	name: string;
	passwordHash: string;
	disabledAt: Date | null;
}

export interface SessionRecord {
	id: string;
	userId: string;
	expiresAt: Date;
}

export interface AuthRepository {
	findUserByEmail(email: string): Promise<AuthUserRecord | undefined>;
	createUser(data: {
		email: string;
		name: string;
		passwordHash: string;
	}): Promise<AuthUserRecord>;
	updatePassword(userId: string, passwordHash: string): Promise<void>;
	createSession(session: SessionRecord): Promise<void>;
	findSession(
		sessionId: string,
	): Promise<{ session: SessionRecord; user: AuthUserRecord } | undefined>;
	deleteSession(sessionId: string): Promise<void>;
	deleteExpiredSessions(userId: string, now: Date): Promise<void>;
	deleteSessionsByUser(userId: string): Promise<void>;
}

export type AuthUser = { id: string; email: string; name: string };

export function hashSessionToken(token: string) {
	return createHash("sha256").update(token).digest("hex");
}

export function toAuthUser(user: AuthUserRecord): AuthUser {
	return { id: user.id, email: user.email, name: user.name };
}

let dummyHash: Promise<string> | undefined;

export class AuthService {
	private readonly now: () => Date;

	constructor(
		private readonly repository: AuthRepository,
		private readonly options: { ttlHours: number; now?: () => Date },
	) {
		this.now = options.now ?? (() => new Date());
	}

	get ttlSeconds() {
		return this.options.ttlHours * 3600;
	}

	async login(email: string, password: string) {
		const user = await this.repository.findUserByEmail(email);
		// Always runs scrypt, so unknown emails take about as long as wrong passwords.
		dummyHash ??= hashPassword("dummy-password-for-timing");
		const valid = await verifyPassword(
			password,
			user ? user.passwordHash : await dummyHash,
		);
		if (!user || !valid || user.disabledAt) return null;

		const now = this.now();
		await this.repository.deleteExpiredSessions(user.id, now);
		const token = randomBytes(32).toString("base64url");
		await this.repository.createSession({
			id: hashSessionToken(token),
			userId: user.id,
			expiresAt: new Date(now.getTime() + this.ttlSeconds * 1000),
		});
		return { token, user: toAuthUser(user) };
	}

	async authenticate(token: string): Promise<AuthUser | null> {
		const sessionId = hashSessionToken(token);
		const found = await this.repository.findSession(sessionId);
		if (!found) return null;
		if (found.session.expiresAt.getTime() <= this.now().getTime()) {
			await this.repository.deleteSession(sessionId);
			return null;
		}
		if (found.user.disabledAt) return null;
		return toAuthUser(found.user);
	}

	async logout(token: string) {
		await this.repository.deleteSession(hashSessionToken(token));
	}
}

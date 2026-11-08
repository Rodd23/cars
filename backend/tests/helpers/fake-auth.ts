import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { createAuthGuard } from "../../src/modules/auth/auth.guard.js";
import { authRoutes } from "../../src/modules/auth/auth.routes.js";
import {
	AuthService,
	type AuthRepository,
	type AuthUserRecord,
	type SessionRecord,
} from "../../src/modules/auth/auth.service.js";

export class FakeAuthRepository implements AuthRepository {
	users: AuthUserRecord[] = [];
	sessions: SessionRecord[] = [];
	calls: string[] = [];

	async findUserByEmail(email: string) {
		return this.users.find((user) => user.email === email);
	}
	async createUser(data: { email: string; name: string; passwordHash: string }) {
		const user = { id: `user-${this.users.length + 1}`, disabledAt: null, ...data };
		this.users.push(user);
		return user;
	}
	async updatePassword(userId: string, passwordHash: string) {
		const user = this.users.find((item) => item.id === userId);
		if (user) user.passwordHash = passwordHash;
	}
	async createSession(session: SessionRecord) {
		this.sessions.push(session);
	}
	async findSession(sessionId: string) {
		const session = this.sessions.find((item) => item.id === sessionId);
		const user = session && this.users.find((item) => item.id === session.userId);
		return session && user ? { session, user } : undefined;
	}
	async deleteSession(sessionId: string) {
		this.sessions = this.sessions.filter((item) => item.id !== sessionId);
	}
	async deleteExpiredSessions(userId: string, now: Date) {
		this.sessions = this.sessions.filter(
			(item) => item.userId !== userId || item.expiresAt.getTime() >= now.getTime(),
		);
	}
	async deleteSessionsByUser(userId: string) {
		this.sessions = this.sessions.filter((item) => item.userId !== userId);
	}
}

export const ALLOWED_ORIGIN = "http://localhost:5173";

export function buildAuth(
	repository: FakeAuthRepository,
	options: { now?: () => Date; ttlHours?: number } = {},
) {
	const service = new AuthService(repository, {
		ttlHours: options.ttlHours ?? 8,
		...(options.now ? { now: options.now } : {}),
	});
	const guard = createAuthGuard({ service, allowedOrigins: [ALLOWED_ORIGIN] });
	return { service, guard };
}

export async function buildAuthApp(
	repository: FakeAuthRepository,
	options: { now?: () => Date; ttlHours?: number; loginMaxAttempts?: number } = {},
) {
	const app = Fastify();
	await app.register(cookie);
	const { service, guard } = buildAuth(repository, options);
	await app.register(authRoutes, {
		service,
		guard,
		secureCookie: false,
		...(options.loginMaxAttempts ? { loginMaxAttempts: options.loginMaxAttempts } : {}),
	});
	return { app, service, guard };
}

export function sidFrom(setCookie: string | string[] | number | undefined) {
	const header = Array.isArray(setCookie) ? setCookie[0] : String(setCookie);
	return /^sid=([^;]*)/.exec(header ?? "")?.[1] ?? "";
}

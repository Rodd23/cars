import { and, eq, lt } from "drizzle-orm";
import type { createDb } from "../../db/create-db.js";
import { sessions } from "../../db/schema/sessions.js";
import { users } from "../../db/schema/users.js";
import type { AuthRepository, SessionRecord } from "./auth.service.js";

type Db = ReturnType<typeof createDb>["db"];

const userColumns = {
	id: users.id,
	email: users.email,
	name: users.name,
	passwordHash: users.passwordHash,
	disabledAt: users.disabledAt,
};

export class DrizzleAuthRepository implements AuthRepository {
	constructor(private readonly database: Db) {}

	async findUserByEmail(email: string) {
		const [user] = await this.database
			.select(userColumns)
			.from(users)
			.where(eq(users.email, email))
			.limit(1);
		return user;
	}

	async createUser(data: { email: string; name: string; passwordHash: string }) {
		const [user] = await this.database
			.insert(users)
			.values(data)
			.returning(userColumns);
		return user!;
	}

	async updatePassword(userId: string, passwordHash: string) {
		await this.database
			.update(users)
			.set({ passwordHash, updatedAt: new Date() })
			.where(eq(users.id, userId));
	}

	async createSession(session: SessionRecord) {
		await this.database.insert(sessions).values(session);
	}

	async findSession(sessionId: string) {
		const [row] = await this.database
			.select({
				session: {
					id: sessions.id,
					userId: sessions.userId,
					expiresAt: sessions.expiresAt,
				},
				user: userColumns,
			})
			.from(sessions)
			.innerJoin(users, eq(sessions.userId, users.id))
			.where(eq(sessions.id, sessionId))
			.limit(1);
		return row;
	}

	async deleteSession(sessionId: string) {
		await this.database.delete(sessions).where(eq(sessions.id, sessionId));
	}

	async deleteExpiredSessions(userId: string, now: Date) {
		await this.database
			.delete(sessions)
			.where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, now)));
	}

	async deleteSessionsByUser(userId: string) {
		await this.database.delete(sessions).where(eq(sessions.userId, userId));
	}
}

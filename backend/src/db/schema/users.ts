import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
	id: uuid("id").defaultRandom().primaryKey(),
	email: varchar("email", { length: 254 }).notNull().unique(),
	name: varchar("name", { length: 120 }).notNull(),
	passwordHash: varchar("password_hash", { length: 255 }).notNull(),
	disabledAt: timestamp("disabled_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/index.js";

// Needs only the connection string, so the CLI does not depend on the full API env.
export function createDb(connectionString: string) {
	const pool = new Pool({ connectionString });
	return { pool, db: drizzle({ client: pool, schema }) };
}

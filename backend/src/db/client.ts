import { env } from "../config/env.js";
import { createDb } from "./create-db.js";

export const { pool, db } = createDb(env.DATABASE_URL);

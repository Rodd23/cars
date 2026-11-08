import "dotenv/config";
import { z } from "zod";
import { corsOriginsSchema, DEFAULT_DEVELOPMENT_CORS_ORIGINS } from "./cors.js";

const envSchema = z.object({
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
	PORT: z.coerce.number().int().min(1).default(3333),
	DATABASE_URL: z.string().min(1),
	OPENAI_API_KEY: z.string().min(1),
	OPENAI_MODEL: z.string().min(1),
	CORS_ORIGINS: corsOriginsSchema.default([]),
	SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(8),
});

const parseEnv = envSchema.safeParse(process.env);

if (!parseEnv.success) {
	throw new Error(`Invalid environment variables: ${parseEnv.error.message}`);
}

if (
	parseEnv.data.NODE_ENV === "production" &&
	parseEnv.data.CORS_ORIGINS.length === 0
) {
	throw new Error(
		"Invalid environment variables: CORS_ORIGINS is required in production",
	);
}

export const env = {
	...parseEnv.data,
	CORS_ORIGINS:
		parseEnv.data.CORS_ORIGINS.length > 0
			? parseEnv.data.CORS_ORIGINS
			: DEFAULT_DEVELOPMENT_CORS_ORIGINS,
};

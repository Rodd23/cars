import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { buildCorsOptions } from "./config/cors.js";
import { db } from "./db/client.js";
import { env } from "./config/env.js";
import { createAuthGuard } from "./modules/auth/auth.guard.js";
import { DrizzleAuthRepository } from "./modules/auth/auth.repository.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { AuthService } from "./modules/auth/auth.service.js";
import { carsRoutes } from "./modules/cars/cars.routes.js";
import {
	createOpenAIClient,
	OpenAISearchInterpreter,
} from "./modules/cars/search/search-interpreter.js";

export async function buildApp() {
	const app = Fastify({
		logger: {
			redact: ["req.headers.cookie", 'res.headers["set-cookie"]'],
		},
	});

	await app.register(cors, buildCorsOptions(env.CORS_ORIGINS));
	await app.register(cookie);

	// Liveness only: does not check PostgreSQL or OpenAI.
	app.get("/health", async () => ({ status: "ok" }));

	const service = new AuthService(new DrizzleAuthRepository(db), {
		ttlHours: env.SESSION_TTL_HOURS,
	});
	const guard = createAuthGuard({ service, allowedOrigins: env.CORS_ORIGINS });

	await app.register(authRoutes, {
		service,
		guard,
		secureCookie: env.NODE_ENV === "production",
	});
	await app.register(carsRoutes, {
		guard,
		interpreter: new OpenAISearchInterpreter(
			createOpenAIClient(env.OPENAI_API_KEY),
			env.OPENAI_MODEL,
		),
	});

	return app;
}

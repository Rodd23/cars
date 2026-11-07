import Fastify from "fastify";
import cors from "@fastify/cors";
import { buildCorsOptions } from "./config/cors.js";
import { env } from "./config/env.js";
import { carsRoutes } from "./modules/cars/cars.routes.js";

export async function buildApp() {
	const app = Fastify({
		logger: true,
	});

	await app.register(cors, buildCorsOptions(env.CORS_ORIGINS));

	// Liveness only: does not check PostgreSQL or OpenAI.
	app.get("/health", async () => ({ status: "ok" }));

	app.register(carsRoutes)

    return app;
}

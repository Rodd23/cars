import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import { AuthController } from "./auth.controller.js";
import type { AuthGuard } from "./auth.guard.js";
import type { AuthService } from "./auth.service.js";

export async function authRoutes(
	app: FastifyInstance,
	options: {
		service: AuthService;
		guard: AuthGuard;
		secureCookie: boolean;
		loginMaxAttempts?: number;
	},
) {
	const controller = new AuthController(options.service, options.secureCookie);

	// global: false, so only routes with config.rateLimit are limited.
	await app.register(rateLimit, { global: false });

	app.post(
		"/auth/login",
		{
			config: {
				rateLimit: { max: options.loginMaxAttempts ?? 5, timeWindow: "1 minute" },
			},
		},
		controller.login.bind(controller),
	);
	app.post(
		"/auth/logout",
		{ preHandler: options.guard.requireAllowedOrigin },
		controller.logout.bind(controller),
	);
	app.get(
		"/auth/me",
		{ preHandler: options.guard.requireSession },
		controller.me.bind(controller),
	);
}

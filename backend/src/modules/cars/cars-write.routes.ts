import type { FastifyInstance } from "fastify";
import type { AuthGuard } from "../auth/auth.guard.js";
import { CreateCarController, type CarCreator } from "./cars-create.controller.js";

export async function carCreateRoutes(
	app: FastifyInstance,
	options: { repository: CarCreator; guard: AuthGuard },
) {
	const controller = new CreateCarController(options.repository);
	app.post(
		"/cars",
		{ preHandler: [options.guard.requireAllowedOrigin, options.guard.requireSession] },
		controller.createCar.bind(controller),
	);
}

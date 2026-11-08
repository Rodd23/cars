import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import type { AuthGuard } from "../../auth/auth.guard.js";
import type { CatalogService } from "../catalog/catalog.service.js";
import { AiSearchController, errorBody } from "./ai-search.controller.js";
import type { SearchInterpreter } from "./search-interpreter.js";

// POST /cars/search calls the paid OpenAI API, so it requires a session and is
// limited per user. The rate-limit plugin is registered here (encapsulated), so
// it does not interfere with the one used by the auth routes.
export async function aiSearchRoutes(
	app: FastifyInstance,
	options: {
		interpreter: SearchInterpreter;
		catalog: Pick<CatalogService, "listCars">;
		guard: AuthGuard;
		maxPerMinute?: number;
	},
) {
	const controller = new AiSearchController(options.interpreter, options.catalog);

	// Instance-level onRequest hooks run before the route-level rate-limit hook,
	// so request.user is set when the keyGenerator runs.
	app.addHook("onRequest", options.guard.requireSession);
	await app.register(rateLimit, { global: false });

	app.post(
		"/cars/search",
		{
			config: {
				rateLimit: {
					max: options.maxPerMinute ?? 10,
					timeWindow: "1 minute",
					keyGenerator: (request: { user?: { id: string } }) => request.user?.id ?? "anonymous",
					errorResponseBuilder: () => ({ statusCode: 429, ...errorBody(
						"RATE_LIMITED", "Muitas buscas em pouco tempo. Aguarde um minuto e tente novamente.",
					) }),
				},
			},
		},
		controller.search.bind(controller),
	);
}

import type { FastifyInstance } from "fastify";
import type { AuthGuard } from "../auth/auth.guard.js";
import { CarsRepository } from "./cars.repository.js";
import { carCreateRoutes } from "./cars-write.routes.js";
import { catalogRoutes } from "./catalog/catalog.routes.js";
import { CatalogService } from "./catalog/catalog.service.js";
import { aiSearchRoutes } from "./search/ai-search.routes.js";
import type { SearchInterpreter } from "./search/search-interpreter.js";

export async function carsRoutes(
	app: FastifyInstance,
	options: { guard: AuthGuard; interpreter: SearchInterpreter },
) {
	const repository = new CarsRepository();
	await app.register(catalogRoutes, { repository });
	await app.register(carCreateRoutes, { repository, guard: options.guard });
	await app.register(aiSearchRoutes, {
		interpreter: options.interpreter,
		catalog: new CatalogService(repository),
		guard: options.guard,
	});
}

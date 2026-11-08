import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { CatalogService } from "../catalog/catalog.service.js";
import {
	SearchNotUnderstoodError,
	SearchUnavailableError,
	type SearchInterpreter,
	type SearchUsage,
} from "./search-interpreter.js";

export const aiSearchRequestSchema = z.object({
	search: z.string().trim().min(1).max(300),
	pageSize: z.number().int().min(1).max(100).default(12),
});

export function errorBody(code: string, message: string) {
	return { error: { code, message } };
}

type Outcome = "ok" | "not_understood" | "unavailable" | "error";

export class AiSearchController {
	constructor(
		private readonly interpreter: SearchInterpreter,
		private readonly catalog: Pick<CatalogService, "listCars">,
	) {}

	async search(request: FastifyRequest, reply: FastifyReply) {
		const parsed = aiSearchRequestSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send(errorBody("INVALID_REQUEST", "Parâmetros inválidos."));
		}
		const { search, pageSize } = parsed.data;
		const startedAt = Date.now();
		let outcome: Outcome = "error";
		let usage: SearchUsage | undefined;
		let filterKeys: string[] = [];
		let provider: { status?: number; code?: string } | undefined;

		try {
			const interpretation = await this.interpreter.interpret(search);
			usage = interpretation.usage;
			const { filters, ignored } = interpretation;
			filterKeys = Object.keys(filters);
			const result = await this.catalog.listCars({ page: 1, pageSize, ...filters });
			outcome = "ok";
			return reply.send({ ...result, filters, ignored });
		} catch (error) {
			if (error instanceof SearchNotUnderstoodError) {
				outcome = "not_understood";
				usage = error.usage;
				return reply.status(422).send(errorBody(
					"SEARCH_NOT_UNDERSTOOD",
					"Não entendi a busca. Tente citar marca, modelo, ano ou quilometragem.",
				));
			}
			if (error instanceof SearchUnavailableError) {
				outcome = "unavailable";
				provider = {
					...(error.providerStatus !== undefined && { status: error.providerStatus }),
					...(error.providerCode !== undefined && { code: error.providerCode }),
				};
				return reply.status(503).send(errorBody(
					"AI_UNAVAILABLE", "A busca inteligente está indisponível. Use os filtros.",
				));
			}
			return reply.status(500).send(errorBody(
				"INTERNAL_ERROR", "Não foi possível realizar a busca.",
			));
		} finally {
			// Never log the search text or filter values (D4), nor raw provider/DB errors.
			request.log.info({
				userId: request.user?.id,
				durationMs: Date.now() - startedAt,
				promptTokens: usage?.promptTokens,
				completionTokens: usage?.completionTokens,
				outcome,
				filterKeys,
				...(provider && { provider }),
			}, "Busca IA");
		}
	}
}

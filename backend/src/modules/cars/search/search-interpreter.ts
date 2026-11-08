import OpenAI from "openai";
import { z } from "zod";
import {
	catalogQuerySchema,
	type CatalogFilters,
} from "../catalog/catalog.schema.js";

const TOOL_NAME = "buscar_carros";
const MAX_IGNORED_ITEMS = 5;
const MAX_IGNORED_LENGTH = 60;

export type SearchUsage = {
	promptTokens: number | undefined;
	completionTokens: number | undefined;
};

export type SearchInterpretation = {
	filters: CatalogFilters;
	ignored: string[];
	usage: SearchUsage;
};

export interface SearchInterpreter {
	interpret(text: string): Promise<SearchInterpretation>;
}

// The model answered, but not with usable filters.
export class SearchNotUnderstoodError extends Error {
	constructor(readonly usage: SearchUsage = {
		promptTokens: undefined, completionTokens: undefined,
	}) {
		super("Search could not be interpreted");
		this.name = "SearchNotUnderstoodError";
	}
}

// Provider unreachable, timed out or refused (5xx, 401, 429...). The message
// is generic on purpose; only the status/code are kept, for logging.
export class SearchUnavailableError extends Error {
	constructor(readonly providerStatus?: number, readonly providerCode?: string) {
		super("Search provider unavailable");
		this.name = "SearchUnavailableError";
	}
}

const nullableText = (max: number) => z.string().trim().max(max).nullish();
const nullableInt = z.number().int().nullish();

const toolArgsSchema = z.strictObject({
	marca: nullableText(80),
	nome: nullableText(120),
	versao: nullableText(120),
	ano: nullableInt,
	ano_min: nullableInt,
	ano_max: nullableInt,
	km_min: nullableInt,
	km_max: nullableInt,
	preco_min: nullableInt,
	preco_max: nullableInt,
	ignorados: z.array(z.unknown()).nullish(),
});

const nullable = (type: "string" | "integer", description: string) => ({
	type: [type, "null"],
	description,
});

// strict: true requires every property in `required` and additionalProperties: false.
const BUSCAR_CARROS_TOOL = {
	type: "function" as const,
	function: {
		name: TOOL_NAME,
		strict: true,
		description:
			"Traduz o pedido do usuário em filtros do catálogo de veículos. Use null nos campos que o pedido não menciona. Critérios que não cabem nos campos (cor, câmbio, combustível etc.) vão em `ignorados`.",
		parameters: {
			type: "object",
			additionalProperties: false,
			required: [
				"marca", "nome", "versao", "ano", "ano_min", "ano_max",
				"km_min", "km_max", "preco_min", "preco_max", "ignorados",
			],
			properties: {
				marca: nullable("string", "Fabricante (ex.: BMW, Fiat)"),
				nome: nullable("string", "Modelo (ex.: Gol, T-Cross, 320i)"),
				versao: nullable("string", "Versão ou motor (ex.: 1.4, Comfortline)"),
				ano: nullable("integer", "Ano-modelo exato; não use junto com ano_min/ano_max"),
				ano_min: nullable("integer", "Ano mínimo (ex.: 'a partir de 2019' -> 2019)"),
				ano_max: nullable("integer", "Ano máximo"),
				km_min: nullable("integer", "Quilometragem mínima em km inteiros"),
				km_max: nullable("integer", "Quilometragem máxima em km inteiros ('50 mil km' -> 50000)"),
				preco_min: nullable("integer", "Preço mínimo em reais inteiros"),
				preco_max: nullable("integer", "Preço máximo em reais inteiros ('até 60 mil' -> 60000)"),
				ignorados: {
					type: ["array", "null"],
					items: { type: "string" },
					description: "Critérios reconhecidos que não cabem nos outros campos, em poucas palavras (ex.: 'cor preta')",
				},
			},
		},
	},
} satisfies OpenAI.ChatCompletionTool;

const SYSTEM_PROMPT =
	"Assistente de catálogo de veículos (português). Chame buscar_carros exatamente uma vez, traduzindo o pedido do usuário nestes campos: marca (fabricante), nome (modelo), versao (motor/trim), ano (ano-modelo exato; nunca junto com ano_min/ano_max), ano_min e ano_max (faixa de anos), km_min e km_max (quilometragem em km inteiros; 50 mil -> 50000), preco_min e preco_max (reais inteiros; 60 mil -> 60000). Use null nos campos não mencionados. Critérios que não cabem nesses campos (cor, câmbio, combustível etc.) vão em `ignorados`; nunca invente valores. Para pedidos genéricos (ex.: 'mostre tudo'), use null em todos os campos.";

// Minimal surface of the OpenAI SDK used here, so tests can inject a fake.
export interface ChatCompletionsClient {
	chat: {
		completions: {
			create(
				body: OpenAI.ChatCompletionCreateParamsNonStreaming,
			): Promise<OpenAI.ChatCompletion>;
		};
	};
}

export function createOpenAIClient(apiKey: string): ChatCompletionsClient {
	return new OpenAI({ apiKey, timeout: 10_000, maxRetries: 1 });
}

function sanitizeIgnored(values: unknown[] | null | undefined) {
	const result: string[] = [];
	for (const value of values ?? []) {
		if (typeof value !== "string") continue;
		const text = value.trim();
		if (text.length === 0 || text.length > MAX_IGNORED_LENGTH) continue;
		result.push(text);
		if (result.length === MAX_IGNORED_ITEMS) break;
	}
	return result;
}

export class OpenAISearchInterpreter implements SearchInterpreter {
	constructor(
		private readonly client: ChatCompletionsClient,
		private readonly model: string,
	) {}

	async interpret(text: string): Promise<SearchInterpretation> {
		let completion: OpenAI.ChatCompletion;
		try {
			completion = await this.client.chat.completions.create({
				model: this.model,
				temperature: 0,
				messages: [
					{ role: "system", content: SYSTEM_PROMPT },
					{ role: "user", content: text },
				],
				tools: [BUSCAR_CARROS_TOOL],
				tool_choice: "required",
			});
		} catch (error) {
			if (error instanceof OpenAI.APIError) {
				// APIConnectionError/timeouts have no status; others carry it.
				throw new SearchUnavailableError(
					error.status,
					typeof error.code === "string" ? error.code : undefined,
				);
			}
			throw error;
		}

		const usage: SearchUsage = {
			promptTokens: completion.usage?.prompt_tokens,
			completionTokens: completion.usage?.completion_tokens,
		};
		const notUnderstood = () => new SearchNotUnderstoodError(usage);

		const call = (completion.choices[0]?.message.tool_calls ?? []).find(
			(c): c is OpenAI.ChatCompletionMessageFunctionToolCall =>
				c.type === "function" && c.function.name === TOOL_NAME,
		);
		if (!call) throw notUnderstood();

		let json: unknown;
		try {
			json = JSON.parse(call.function.arguments);
		} catch {
			throw notUnderstood();
		}
		const args = toolArgsSchema.safeParse(json);
		if (!args.success) throw notUnderstood();
		const a = args.data;

		const hasExactYear = a.ano != null;
		if (hasExactYear && (a.ano_min != null || a.ano_max != null)) {
			throw notUnderstood();
		}

		const raw: Record<string, string> = {};
		const put = (key: string, value: string | number | null | undefined) => {
			if (value === null || value === undefined || value === "") return;
			raw[key] = String(value);
		};
		put("brand", a.marca);
		put("model", a.nome);
		put("version", a.versao);
		put("yearMin", hasExactYear ? a.ano : a.ano_min);
		put("yearMax", hasExactYear ? a.ano : a.ano_max);
		put("mileageMin", a.km_min);
		put("mileageMax", a.km_max);
		put("priceMin", a.preco_min);
		put("priceMax", a.preco_max);

		// Same schema as GET /cars: single source of the limits.
		const parsed = catalogQuerySchema.safeParse(raw);
		if (!parsed.success) throw notUnderstood();
		const { page: _page, pageSize: _pageSize, ...filters } = parsed.data;

		return { filters, ignored: sanitizeIgnored(a.ignorados), usage };
	}
}

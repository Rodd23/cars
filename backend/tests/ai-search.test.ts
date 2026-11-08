import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import OpenAI from "openai";
import { hashPassword } from "../src/modules/auth/password.js";
import { aiSearchRoutes } from "../src/modules/cars/search/ai-search.routes.js";
import {
	OpenAISearchInterpreter,
	SearchNotUnderstoodError,
	SearchUnavailableError,
	type ChatCompletionsClient,
	type SearchInterpretation,
	type SearchInterpreter,
} from "../src/modules/cars/search/search-interpreter.js";
import type { CatalogQuery } from "../src/modules/cars/catalog/catalog.schema.js";
import { FakeAuthRepository, buildAuth } from "./helpers/fake-auth.js";

const SECRET_TEXT = "bmw segredo-do-usuario 12345";

const interpretation = (over: Partial<SearchInterpretation> = {}): SearchInterpretation => ({
	filters: {}, ignored: [], usage: { promptTokens: 120, completionTokens: 15 }, ...over,
});

function fakeInterpreter(impl: (text: string) => Promise<SearchInterpretation>) {
	const calls: string[] = [];
	const interpreter: SearchInterpreter = {
		interpret: async (text) => { calls.push(text); return impl(text); },
	};
	return { interpreter, calls };
}

async function setup(options: {
	interpret?: (text: string) => Promise<SearchInterpretation>;
	listCars?: (query: CatalogQuery) => Promise<{ items: unknown[]; pagination: unknown }>;
	maxPerMinute?: number;
	logStream?: { write(chunk: string): void };
} = {}) {
	const authRepo = new FakeAuthRepository();
	for (const [id, email] of [["user-1", "ana@empresa.com"], ["user-2", "bia@empresa.com"]] as const) {
		authRepo.users.push({
			id, email, name: id, passwordHash: await hashPassword("senha-correta-123"), disabledAt: null,
		});
	}
	const { service, guard } = buildAuth(authRepo);
	const sid1 = (await service.login("ana@empresa.com", "senha-correta-123"))!.token;
	const sid2 = (await service.login("bia@empresa.com", "senha-correta-123"))!.token;
	const { interpreter, calls } = fakeInterpreter(options.interpret ?? (async () => interpretation()));
	const listed: CatalogQuery[] = [];
	const catalog = {
		listCars: async (query: CatalogQuery) => {
			listed.push(query);
			return (options.listCars ?? (async () => ({
				items: [],
				pagination: { page: query.page, pageSize: query.pageSize, totalItems: 0, totalPages: 0 },
			})))(query);
		},
	};
	const app = Fastify(options.logStream ? { logger: { level: "info", stream: options.logStream } } : {});
	await app.register(cookie);
	await app.register(aiSearchRoutes, {
		interpreter, catalog: catalog as never, guard,
		...(options.maxPerMinute ? { maxPerMinute: options.maxPerMinute } : {}),
	});
	const post = (payload: unknown, sid: string | undefined = sid1) => app.inject({
		method: "POST", url: "/cars/search", payload: payload as never, ...(sid ? { cookies: { sid } } : {}),
	});
	return { app, post, calls, listed, sid1, sid2 };
}

test("requires a session and does not call the interpreter without it", async (t) => {
	const { app, post, calls } = await setup();
	t.after(() => app.close());
	assert.equal((await post({ search: "uno" }, "")).statusCode, 401);
	assert.equal((await post({ search: "uno" }, "invalido")).statusCode, 401);
	assert.equal(calls.length, 0);
});

test("AC7: invalid body is 400 INVALID_REQUEST without calling the interpreter", async (t) => {
	const { app, post, calls } = await setup();
	t.after(() => app.close());
	for (const payload of [{}, { search: "" }, { search: "   " }, { search: "x".repeat(301) },
		{ search: 5 }, { search: "uno", pageSize: 0 }, { search: "uno", pageSize: 101 },
		{ search: "uno", pageSize: 1.5 }, { search: "uno", pageSize: "10" }]) {
		const response = await post(payload);
		assert.equal(response.statusCode, 400, JSON.stringify(payload));
		assert.equal(response.json().error.code, "INVALID_REQUEST");
	}
	assert.equal(calls.length, 0);
});

test("AC5: empty filters give 200 with the paginated first page", async (t) => {
	const { app, post, listed } = await setup();
	t.after(() => app.close());
	const response = await post({ search: "mostre tudo" });
	assert.equal(response.statusCode, 200);
	assert.deepEqual(listed, [{ page: 1, pageSize: 12 }]);
	assert.deepEqual(response.json(), {
		items: [], pagination: { page: 1, pageSize: 12, totalItems: 0, totalPages: 0 },
		filters: {}, ignored: [],
	});
});

test("AC9: 200 has items, pagination, filters and ignored; query uses page 1 and pageSize", async (t) => {
	const { app, post, listed, calls } = await setup({
		interpret: async () => interpretation({
			filters: { brand: "BMW", yearMin: 2018, yearMax: 2020, mileageMax: 50000 },
			ignored: ["cor preta"],
		}),
		listCars: async () => ({
			items: [{ id: "1" }],
			pagination: { page: 1, pageSize: 5, totalItems: 1, totalPages: 1 },
		}),
	});
	t.after(() => app.close());
	const response = await post({ search: "  BMW de 2018 a 2020  ", pageSize: 5 });
	assert.equal(response.statusCode, 200);
	assert.deepEqual(calls, ["BMW de 2018 a 2020"]);
	assert.deepEqual(listed, [{ page: 1, pageSize: 5, brand: "BMW", yearMin: 2018, yearMax: 2020, mileageMax: 50000 }]);
	assert.deepEqual(Object.keys(response.json()).sort(), ["filters", "ignored", "items", "pagination"]);
	assert.deepEqual(response.json().filters, { brand: "BMW", yearMin: 2018, yearMax: 2020, mileageMax: 50000 });
	assert.deepEqual(response.json().ignored, ["cor preta"]);
});

test("AC4: not understood is 422 and the catalog is not queried", async (t) => {
	const { app, post, listed } = await setup({ interpret: async () => { throw new SearchNotUnderstoodError(); } });
	t.after(() => app.close());
	const response = await post({ search: "???" });
	assert.equal(response.statusCode, 422);
	assert.equal(response.json().error.code, "SEARCH_NOT_UNDERSTOOD");
	assert.equal(response.json().error.message, "Não entendi a busca. Tente citar marca, modelo, ano ou quilometragem.");
	assert.equal(listed.length, 0);
});

test("AC6: provider unavailability is 503 without provider details", async (t) => {
	const { app, post, listed } = await setup({
		interpret: async () => { throw new SearchUnavailableError(429, "insufficient_quota"); },
	});
	t.after(() => app.close());
	const response = await post({ search: "uno" });
	assert.equal(response.statusCode, 503);
	assert.deepEqual(response.json(), { error: {
		code: "AI_UNAVAILABLE", message: "A busca inteligente está indisponível. Use os filtros.",
	} });
	assert.equal(listed.length, 0);
});

test("catalog or unexpected failures are 500 INTERNAL_ERROR without leaking details", async (t) => {
	const { app, post } = await setup({
		listCars: async () => { throw new Error("postgres://secret:password@private SELECT cars"); },
	});
	t.after(() => app.close());
	const response = await post({ search: "uno" });
	assert.equal(response.statusCode, 500);
	assert.equal(response.json().error.code, "INTERNAL_ERROR");
	assert.doesNotMatch(response.body, /secret|password|SELECT|postgres/);
});

test("AC8: the 11th search in a minute is 429 without calling the interpreter; other users are unaffected", async (t) => {
	const { app, post, calls, sid1, sid2 } = await setup({ maxPerMinute: 10 });
	t.after(() => app.close());
	for (let i = 0; i < 10; i++) assert.equal((await post({ search: "uno" }, sid1)).statusCode, 200);
	const limited = await post({ search: "uno" }, sid1);
	assert.equal(limited.statusCode, 429);
	assert.equal(limited.json().error.code, "RATE_LIMITED");
	assert.equal(calls.length, 10);
	assert.equal((await post({ search: "uno" }, sid2)).statusCode, 200);
	assert.equal(calls.length, 11);
});

test("AC11: the search log has usage, duration and outcome but never the text or filter values", async (t) => {
	const lines: string[] = [];
	const { app, post } = await setup({
		logStream: { write: (chunk) => { lines.push(chunk); } },
		interpret: async () => interpretation({ filters: { brand: "segredo-marca", mileageMax: 77777 } }),
	});
	t.after(() => app.close());
	assert.equal((await post({ search: SECRET_TEXT })).statusCode, 200);
	const entry = lines.map((line) => JSON.parse(line)).find((l) => l.msg === "Busca IA");
	assert.ok(entry);
	assert.equal(entry.userId, "user-1");
	assert.equal(entry.outcome, "ok");
	assert.equal(entry.promptTokens, 120);
	assert.equal(entry.completionTokens, 15);
	assert.equal(typeof entry.durationMs, "number");
	assert.deepEqual(entry.filterKeys, ["brand", "mileageMax"]);
	assert.doesNotMatch(lines.join(""), /segredo|12345|77777/);
});

// --- OpenAI interpreter with a simulated client ---

function toolCompletion(args: unknown, name = "buscar_carros") {
	return {
		choices: [{ message: { tool_calls: [{
			type: "function", id: "c1",
			function: { name, arguments: typeof args === "string" ? args : JSON.stringify(args) },
		}] } }],
		usage: { prompt_tokens: 100, completion_tokens: 10 },
	} as unknown as OpenAI.ChatCompletion;
}

function interpreterWith(respond: () => Promise<OpenAI.ChatCompletion>) {
	const requests: OpenAI.ChatCompletionCreateParamsNonStreaming[] = [];
	const client: ChatCompletionsClient = { chat: { completions: {
		create: async (body) => { requests.push(body); return respond(); },
	} } };
	return { interpreter: new OpenAISearchInterpreter(client, "test-model"), requests };
}

const NULLS = {
	marca: null, nome: null, versao: null, ano: null, ano_min: null, ano_max: null,
	km_min: null, km_max: null, preco_min: null, preco_max: null, ignorados: null,
};

test("AC3: strict tool args become catalog filters; ano becomes yearMin = yearMax", async () => {
	const full = interpreterWith(async () => toolCompletion({
		...NULLS, marca: " BMW ", nome: "320i", versao: "2.0", ano_min: 2018, ano_max: 2020,
		km_min: 1000, km_max: 50000, preco_min: 30000, preco_max: 90000, ignorados: ["cor preta"],
	}));
	const result = await full.interpreter.interpret("texto");
	assert.deepEqual(result.filters, {
		brand: "BMW", model: "320i", version: "2.0", yearMin: 2018, yearMax: 2020,
		mileageMin: 1000, mileageMax: 50000, priceMin: 30000, priceMax: 90000,
	});
	assert.deepEqual(result.ignored, ["cor preta"]);
	assert.deepEqual(result.usage, { promptTokens: 100, completionTokens: 10 });
	const request = full.requests[0]!;
	assert.equal(request.model, "test-model");
	assert.equal(request.temperature, 0);
	assert.equal(request.tool_choice, "required");
	const tool = request.tools![0] as OpenAI.ChatCompletionFunctionTool;
	assert.equal(tool.function.strict, true);
	const parameters = tool.function.parameters as { required: string[]; properties: object };
	assert.deepEqual([...parameters.required].sort(), Object.keys(parameters.properties).sort());

	const exact = interpreterWith(async () => toolCompletion({ ...NULLS, ano: 2020 }));
	assert.deepEqual((await exact.interpreter.interpret("x")).filters, { yearMin: 2020, yearMax: 2020 });

	const empty = interpreterWith(async () => toolCompletion({ ...NULLS }));
	assert.deepEqual((await empty.interpreter.interpret("x")).filters, {});
	const bare = interpreterWith(async () => toolCompletion({}));
	assert.deepEqual((await bare.interpreter.interpret("x")).filters, {});
});

test("AC9: ignored is truncated to 5 items of up to 60 chars; invalid entries are dropped", async () => {
	const { interpreter } = interpreterWith(async () => toolCompletion({
		...NULLS,
		ignorados: ["a", "", "   ", "x".repeat(61), 5, null, "b", "c", "d", "e", "f", "g"],
	}));
	assert.deepEqual((await interpreter.interpret("x")).ignored, ["a", "b", "c", "d", "e"]);
});

test("AC4: invalid model output raises SearchNotUnderstoodError", async () => {
	const year = new Date().getFullYear();
	const cases: unknown[] = [
		{ choices: [{ message: { content: "oi" } }] },
		{ choices: [] },
		toolCompletion({ ...NULLS }, "outra_funcao"),
		toolCompletion("{nao e json"),
		toolCompletion({ ...NULLS, marca: 5 }),
		toolCompletion({ ...NULLS, desconhecido: 1 }),
		toolCompletion({ ...NULLS, ano: 1.5 }),
		toolCompletion({ ...NULLS, ano: 2020, ano_min: 2018 }),
		toolCompletion({ ...NULLS, ano_min: 2021, ano_max: 2019 }),
		toolCompletion({ ...NULLS, km_min: 10, km_max: 5 }),
		toolCompletion({ ...NULLS, preco_min: 10, preco_max: 5 }),
		toolCompletion({ ...NULLS, ano: 1800 }),
		toolCompletion({ ...NULLS, ano: year + 2 }),
		toolCompletion({ ...NULLS, km_max: -1 }),
		toolCompletion({ ...NULLS, km_max: 2_000_001 }),
		toolCompletion({ ...NULLS, preco_max: 0 }),
		toolCompletion({ ...NULLS, preco_max: 10_000_000_000 }),
		toolCompletion({ ...NULLS, marca: "x".repeat(81) }),
	];
	for (const [index, completion] of cases.entries()) {
		const { interpreter } = interpreterWith(async () => completion as OpenAI.ChatCompletion);
		await assert.rejects(interpreter.interpret("x"), SearchNotUnderstoodError, `case ${index}`);
	}
});

test("AC6: SDK errors (timeout, connection, 5xx, 401, 429) raise SearchUnavailableError without the provider message", async () => {
	const errors: Error[] = [
		new OpenAI.APIConnectionTimeoutError(),
		new OpenAI.APIConnectionError({ message: "ECONNRESET secret-host" }),
		...[500, 503, 401, 429].map((status) => OpenAI.APIError.generate(
			status, { message: "sk-secret-key quota", code: "insufficient_quota" }, "sk-secret-key quota", new Headers(),
		)),
	];
	for (const error of errors) {
		const { interpreter } = interpreterWith(async () => { throw error; });
		await assert.rejects(interpreter.interpret("x"), (caught) => {
			assert.ok(caught instanceof SearchUnavailableError);
			assert.doesNotMatch(caught.message, /secret|quota|ECONN/);
			return true;
		});
	}
	const { interpreter } = interpreterWith(async () => { throw new TypeError("bug"); });
	await assert.rejects(interpreter.interpret("x"), TypeError);
});

test("AC4/AC6 end to end: route + OpenAI interpreter with a simulated client", async (t) => {
	let respond: () => Promise<OpenAI.ChatCompletion> = async () => toolCompletion({ ...NULLS, ano: 2020, ano_min: 2018 });
	const { interpreter } = interpreterWith(() => respond());
	const { app, post, listed } = await setup({ interpret: (text) => interpreter.interpret(text) });
	t.after(() => app.close());
	assert.equal((await post({ search: "x" })).statusCode, 422);
	respond = async () => { throw new OpenAI.APIConnectionTimeoutError(); };
	const unavailable = await post({ search: "x" });
	assert.equal(unavailable.statusCode, 503);
	assert.equal(listed.length, 0);
	respond = async () => toolCompletion({ ...NULLS, marca: "BMW", ignorados: ["cor preta"] });
	const ok = await post({ search: "x" });
	assert.equal(ok.statusCode, 200);
	assert.deepEqual(ok.json().filters, { brand: "BMW" });
	assert.deepEqual(ok.json().ignored, ["cor preta"]);
});

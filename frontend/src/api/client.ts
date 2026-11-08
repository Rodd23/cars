import type {
	ApiFieldError,
	AuthUser,
	Car,
	CarInput,
	CarListQuery,
	CarListResponse,
	SearchResponse,
} from "./types.js";

export type ApiErrorKind =
	| "not_found"
	| "http"
	| "network"
	| "unauthorized"
	| "forbidden"
	| "rate_limited"
	| "validation"
	| "unprocessable"
	| "unavailable";

export class ApiError extends Error {
	readonly kind: ApiErrorKind;
	readonly status: number | null;
	readonly details: ApiFieldError[];
	/** Código e mensagem de `{ error: { code, message } }`, quando o backend os envia. */
	readonly code: string | null;
	readonly serverMessage: string | null;

	constructor(
		kind: ApiErrorKind,
		status: number | null = null,
		details: ApiFieldError[] = [],
		body: { code: string | null; message: string | null } = { code: null, message: null },
	) {
		super(`API error: ${kind}${status ? ` ${status}` : ""}`);
		this.name = "ApiError";
		this.kind = kind;
		this.status = status;
		this.details = details;
		this.code = body.code;
		this.serverMessage = body.message;
	}
}

export function isAbortError(error: unknown): boolean {
	return error instanceof DOMException && error.name === "AbortError";
}

function baseUrl(): string {
	const raw = import.meta.env.VITE_API_URL as string | undefined;
	return (raw && raw.trim() !== "" ? raw : "http://localhost:3333").replace(/\/+$/, "");
}

const FILTER_KEYS = [
	"brand",
	"model",
	"version",
	"yearMin",
	"yearMax",
	"mileageMin",
	"mileageMax",
	"priceMin",
	"priceMax",
] as const;

type RequestOptions = { method?: "GET" | "POST"; body?: unknown; signal?: AbortSignal | undefined };

function parseDetails(body: unknown): ApiFieldError[] {
	const raw = (body as { details?: unknown } | null | undefined)?.details;
	if (!Array.isArray(raw)) return [];
	const result: ApiFieldError[] = [];
	for (const item of raw) {
		const { path, message } = (item ?? {}) as { path?: unknown; message?: unknown };
		if (typeof path === "string" && typeof message === "string") result.push({ path, message });
	}
	return result;
}

function parseErrorBody(body: unknown): { code: string | null; message: string | null } {
	const error = (body as { error?: unknown } | null | undefined)?.error;
	if (error === null || typeof error !== "object") return { code: null, message: null };
	const { code, message } = error as { code?: unknown; message?: unknown };
	return {
		code: typeof code === "string" ? code : null,
		message: typeof message === "string" && message.trim() !== "" ? message : null,
	};
}

async function readJson(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch (error) {
		if (isAbortError(error)) throw error;
		return undefined;
	}
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
	const { method = "GET", body, signal } = options;
	const headers: Record<string, string> = { Accept: "application/json" };
	if (body !== undefined) headers["Content-Type"] = "application/json";
	let response: Response;
	try {
		response = await fetch(`${baseUrl()}${path}`, {
			method,
			headers,
			credentials: "include",
			...(body !== undefined ? { body: JSON.stringify(body) } : {}),
			...(signal ? { signal } : {}),
		});
	} catch (error) {
		if (isAbortError(error)) throw error;
		throw new ApiError("network");
	}
	if (response.status === 404) throw new ApiError("not_found", 404);
	if (response.status === 401) throw new ApiError("unauthorized", 401);
	if (response.status === 403) throw new ApiError("forbidden", 403);
	if (response.status === 429) {
		throw new ApiError("rate_limited", 429, [], parseErrorBody(await readJson(response)));
	}
	if (response.status === 422 || response.status === 503) {
		const kind = response.status === 422 ? "unprocessable" : "unavailable";
		throw new ApiError(kind, response.status, [], parseErrorBody(await readJson(response)));
	}
	if (response.status === 400 && method !== "GET") {
		const body = await readJson(response);
		throw new ApiError("validation", 400, parseDetails(body), parseErrorBody(body));
	}
	if (!response.ok) throw new ApiError("http", response.status);
	if (response.status === 204) return undefined as T;
	const data = await readJson(response);
	if (data === undefined) throw new ApiError("http", response.status);
	return data as T;
}

export function listCars(query: CarListQuery, signal?: AbortSignal): Promise<CarListResponse> {
	const params = new URLSearchParams();
	params.set("page", String(query.page));
	params.set("pageSize", String(query.pageSize));
	for (const key of FILTER_KEYS) {
		const value = query[key]?.trim();
		if (value) params.set(key, value);
	}
	return request<CarListResponse>(`/cars?${params.toString()}`, { signal });
}

/** Interpreta o texto com a IA (POST /cars/search). As páginas seguintes vêm de listCars com os filtros devolvidos. */
export async function searchCars(
	input: { search: string; pageSize: number },
	signal?: AbortSignal,
): Promise<SearchResponse> {
	const data = await request<Partial<SearchResponse>>("/cars/search", {
		method: "POST",
		body: { search: input.search, pageSize: input.pageSize },
		signal,
	});
	return {
		items: Array.isArray(data.items) ? data.items : [],
		pagination: data.pagination ?? { page: 1, pageSize: input.pageSize, totalItems: 0, totalPages: 0 },
		filters: data.filters && typeof data.filters === "object" ? data.filters : {},
		ignored: Array.isArray(data.ignored) ? data.ignored.filter((i): i is string => typeof i === "string") : [],
	};
}

export function getCar(id: string, signal?: AbortSignal): Promise<Car> {
	return request<Car>(`/cars/${encodeURIComponent(id)}`, { signal });
}

export async function login(email: string, password: string): Promise<AuthUser> {
	const data = await request<{ user: AuthUser }>("/auth/login", { method: "POST", body: { email, password } });
	return data.user;
}

export async function logout(): Promise<void> {
	await request<void>("/auth/logout", { method: "POST" });
}

/** Retorna o usuário da sessão ou null quando não há sessão (401). */
export async function getMe(signal?: AbortSignal): Promise<AuthUser | null> {
	try {
		const data = await request<{ user?: AuthUser }>("/auth/me", { signal });
		return data.user && typeof data.user.id === "string" ? data.user : null;
	} catch (error) {
		if (error instanceof ApiError && error.kind === "unauthorized") return null;
		throw error;
	}
}

export function createCar(input: CarInput): Promise<Car> {
	return request<Car>("/cars", { method: "POST", body: input });
}

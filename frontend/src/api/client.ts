import type { Car, CarListQuery, CarListResponse } from "./types.js";

export type ApiErrorKind = "not_found" | "http" | "network";

export class ApiError extends Error {
	readonly kind: ApiErrorKind;
	readonly status: number | null;

	constructor(kind: ApiErrorKind, status: number | null = null) {
		super(`API error: ${kind}${status ? ` ${status}` : ""}`);
		this.name = "ApiError";
		this.kind = kind;
		this.status = status;
	}
}

export function isAbortError(error: unknown): boolean {
	return error instanceof DOMException && error.name === "AbortError";
}

function baseUrl(): string {
	const raw = import.meta.env.VITE_API_URL as string | undefined;
	return (raw && raw.trim() !== "" ? raw : "http://localhost:3333").replace(/\/+$/, "");
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
	let response: Response;
	try {
		response = await fetch(`${baseUrl()}${path}`, {
			method: "GET",
			headers: { Accept: "application/json" },
			...(signal ? { signal } : {}),
		});
	} catch (error) {
		if (isAbortError(error)) throw error;
		throw new ApiError("network");
	}
	if (response.status === 404) throw new ApiError("not_found", 404);
	if (!response.ok) throw new ApiError("http", response.status);
	try {
		return (await response.json()) as T;
	} catch (error) {
		if (isAbortError(error)) throw error;
		throw new ApiError("http", response.status);
	}
}

export function listCars(query: CarListQuery, signal?: AbortSignal): Promise<CarListResponse> {
	const params = new URLSearchParams();
	params.set("page", String(query.page));
	params.set("pageSize", String(query.pageSize));
	for (const key of ["brand", "model", "version"] as const) {
		const value = query[key]?.trim();
		if (value) params.set(key, value);
	}
	return request<CarListResponse>(`/cars?${params.toString()}`, signal);
}

export function getCar(id: string, signal?: AbortSignal): Promise<Car> {
	return request<Car>(`/cars/${encodeURIComponent(id)}`, signal);
}

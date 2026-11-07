import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

export type Filters = { brand: string; model: string; version: string };

export const PAGE_SIZE = 12;

export function parsePage(raw: string | null): number {
	if (raw === null || !/^\d+$/.test(raw.trim())) return 1;
	const n = Number(raw.trim());
	return Number.isSafeInteger(n) && n >= 1 ? n : 1;
}

export function buildSearch(filters: Filters, page: number): string {
	const params = new URLSearchParams();
	for (const key of ["brand", "model", "version"] as const) {
		const value = filters[key].trim();
		if (value) params.set(key, value);
	}
	if (page > 1) params.set("page", String(page));
	const s = params.toString();
	return s ? `?${s}` : "";
}

export function useCatalogQuery() {
	const [params, setParams] = useSearchParams();
	const brand = (params.get("brand") ?? "").trim();
	const model = (params.get("model") ?? "").trim();
	const version = (params.get("version") ?? "").trim();
	const page = parsePage(params.get("page"));
	const filters = useMemo<Filters>(() => ({ brand, model, version }), [brand, model, version]);
	const hasFilters = Boolean(brand || model || version);

	const apply = useCallback(
		(f: Filters, p: number) => {
			setParams(new URLSearchParams(buildSearch(f, p)));
		},
		[setParams],
	);

	return { filters, page, hasFilters, apply, toSearch: buildSearch };
}

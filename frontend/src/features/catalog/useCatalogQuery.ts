import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import { NUMERIC_KEYS, sanitizeNumericFilters } from "./filtersSchema.js";

export type Filters = {
	brand: string;
	model: string;
	version: string;
	yearMin: string;
	yearMax: string;
	mileageMin: string;
	mileageMax: string;
	priceMin: string;
	priceMax: string;
};

export const EMPTY_FILTERS: Filters = {
	brand: "",
	model: "",
	version: "",
	yearMin: "",
	yearMax: "",
	mileageMin: "",
	mileageMax: "",
	priceMin: "",
	priceMax: "",
};

export const PAGE_SIZE = 12;

const TEXT_KEYS = ["brand", "model", "version"] as const;

export function parsePage(raw: string | null): number {
	if (raw === null || !/^\d+$/.test(raw.trim())) return 1;
	const n = Number(raw.trim());
	return Number.isSafeInteger(n) && n >= 1 ? n : 1;
}

export function buildSearch(filters: Filters, page: number): string {
	const params = new URLSearchParams();
	for (const key of [...TEXT_KEYS, ...NUMERIC_KEYS] as const) {
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
	const numeric = sanitizeNumericFilters({
		yearMin: params.get("yearMin") ?? "",
		yearMax: params.get("yearMax") ?? "",
		mileageMin: params.get("mileageMin") ?? "",
		mileageMax: params.get("mileageMax") ?? "",
		priceMin: params.get("priceMin") ?? "",
		priceMax: params.get("priceMax") ?? "",
	});
	const { yearMin, yearMax, mileageMin, mileageMax, priceMin, priceMax } = numeric;
	const page = parsePage(params.get("page"));
	const filters = useMemo<Filters>(
		() => ({ brand, model, version, yearMin, yearMax, mileageMin, mileageMax, priceMin, priceMax }),
		[brand, model, version, yearMin, yearMax, mileageMin, mileageMax, priceMin, priceMax],
	);
	const hasFilters = Object.values(filters).some((v) => v !== "");

	const apply = useCallback(
		(f: Filters, p: number) => {
			setParams(new URLSearchParams(buildSearch(f, p)));
		},
		[setParams],
	);

	return { filters, page, hasFilters, apply, toSearch: buildSearch };
}

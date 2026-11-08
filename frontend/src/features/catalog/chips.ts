import { formatRange, rangeFilterKeys, type RangeKey } from "./format.js";
import type { Filters } from "./useCatalogQuery.js";

export type FilterChip = { id: string; label: string; keys: (keyof Filters)[] };

const TEXT: { key: "brand" | "model" | "version"; label: string }[] = [
	{ key: "brand", label: "Marca" },
	{ key: "model", label: "Modelo" },
	{ key: "version", label: "Versão" },
];

const RANGES: { range: RangeKey; label: (text: string) => string }[] = [
	{ range: "year", label: (t) => `Ano ${t}` },
	{ range: "mileage", label: (t) => t.charAt(0).toUpperCase() + t.slice(1) },
	{ range: "price", label: (t) => t.charAt(0).toUpperCase() + t.slice(1) },
];

/** Um chip por filtro de texto e um por faixa (ano, quilometragem, preço). */
export function filterChips(filters: Filters): FilterChip[] {
	const chips: FilterChip[] = [];
	for (const { key, label } of TEXT) {
		if (filters[key] !== "") chips.push({ id: key, label: `${label}: ${filters[key]}`, keys: [key] });
	}
	for (const { range, label } of RANGES) {
		const [minKey, maxKey] = rangeFilterKeys(range) as [keyof Filters, keyof Filters];
		const text = formatRange(range, filters[minKey], filters[maxKey]);
		if (text) chips.push({ id: range, label: label(text), keys: [minKey, maxKey] });
	}
	return chips;
}

/** Resumo para o aviso "Entendi: …": marca, modelo, versão e faixas, sem rótulos. */
export function summarizeFilters(filters: Filters): string {
	const parts: string[] = [];
	for (const { key } of TEXT) if (filters[key] !== "") parts.push(filters[key]);
	for (const { range } of RANGES) {
		const [minKey, maxKey] = rangeFilterKeys(range) as [keyof Filters, keyof Filters];
		const text = formatRange(range, filters[minKey], filters[maxKey]);
		if (text) parts.push(text);
	}
	return parts.length > 0 ? parts.join(", ") : "todos os veículos";
}

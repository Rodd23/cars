import { z } from "zod";
import type { Filters } from "./useCatalogQuery.js";

export const NUMERIC_KEYS = ["yearMin", "yearMax", "mileageMin", "mileageMax", "priceMin", "priceMax"] as const;
export type NumericKey = (typeof NUMERIC_KEYS)[number];

/** Pares mín./máx. cuja ordem é validada (espelha o backend). */
const PAIRS: [NumericKey, NumericKey, string][] = [
	["yearMin", "yearMax", "O ano mínimo não pode ser maior que o máximo"],
	["mileageMin", "mileageMax", "A quilometragem mínima não pode ser maior que a máxima"],
	["priceMin", "priceMax", "O preço mínimo não pode ser maior que o máximo"],
];

export const YEAR_MIN = 1886;
export const MILEAGE_MAX = 2_000_000;
export const PRICE_MAX = 9_999_999_999;

type Limits = { min: number; max: number; message: string };

function limits(): Record<NumericKey, Limits> {
	const year: Limits = {
		min: YEAR_MIN,
		max: new Date().getFullYear() + 1,
		message: `Informe um ano entre ${YEAR_MIN} e ${new Date().getFullYear() + 1}`,
	};
	const mileage: Limits = { min: 0, max: MILEAGE_MAX, message: "Informe de 0 a 2.000.000 km" };
	const price: Limits = { min: 1, max: PRICE_MAX, message: "Informe um valor de 1 a 9.999.999.999 reais" };
	return { yearMin: year, yearMax: year, mileageMin: mileage, mileageMax: mileage, priceMin: price, priceMax: price };
}

/** Campo opcional: vazio é válido; senão, só dígitos e dentro da faixa. */
function field(l: Limits) {
	return z
		.string()
		.trim()
		.refine((v) => v === "" || /^\d{1,10}$/.test(v), "Use apenas dígitos")
		.refine((v) => v === "" || !/^\d{1,10}$/.test(v) || (Number(v) >= l.min && Number(v) <= l.max), l.message);
}

export function buildFiltersSchema() {
	const l = limits();
	return z
		.object({
			yearMin: field(l.yearMin),
			yearMax: field(l.yearMax),
			mileageMin: field(l.mileageMin),
			mileageMax: field(l.mileageMax),
			priceMin: field(l.priceMin),
			priceMax: field(l.priceMax),
		})
		.superRefine((value, ctx) => {
			for (const [minKey, maxKey, message] of PAIRS) {
				const lo = value[minKey];
				const hi = value[maxKey];
				if (lo !== "" && hi !== "" && /^\d+$/.test(lo) && /^\d+$/.test(hi) && Number(lo) > Number(hi)) {
					ctx.addIssue({ code: "custom", path: [maxKey], message });
				}
			}
		});
}

export type FilterErrors = Partial<Record<NumericKey, string>>;

/** Erros por campo numérico; objeto vazio quando tudo é válido. */
export function validateNumericFilters(values: Pick<Filters, NumericKey>): FilterErrors {
	const result = buildFiltersSchema().safeParse(values);
	if (result.success) return {};
	const errors: FilterErrors = {};
	for (const issue of result.error.issues) {
		const key = issue.path[0];
		if ((NUMERIC_KEYS as readonly PropertyKey[]).includes(key as NumericKey) && !errors[key as NumericKey]) {
			errors[key as NumericKey] = issue.message;
		}
	}
	return errors;
}

/**
 * Normaliza valores vindos da URL: o que for inválido é descartado (campo isolado inválido
 * zera só ele; par fora de ordem zera o máximo). Zeros à esquerda são normalizados.
 */
export function sanitizeNumericFilters(raw: Pick<Filters, NumericKey>): Pick<Filters, NumericKey> {
	const clean = { ...raw };
	for (const key of NUMERIC_KEYS) clean[key] = raw[key].trim();
	const errors = validateNumericFilters(clean);
	for (const key of NUMERIC_KEYS) {
		if (errors[key]) clean[key] = "";
		else if (clean[key] !== "") clean[key] = String(Number(clean[key]));
	}
	return clean;
}

import { z } from "zod";
import type { CarInput } from "../../api/types.js";

/** Espelha os limites de backend/src/modules/cars/cars.schema.ts; o backend continua sendo a fonte da verdade. */

export const FIELD_NAMES = [
	"brand",
	"model",
	"version",
	"year",
	"price",
	"fuel",
	"transmission",
	"mileage",
	"imageUrl",
] as const;

export type FieldName = (typeof FIELD_NAMES)[number];
export type FormValues = Record<FieldName, string>;
export type FieldErrors = Partial<Record<FieldName, string>>;

export const EMPTY_VALUES: FormValues = {
	brand: "",
	model: "",
	version: "",
	year: "",
	price: "",
	fuel: "",
	transmission: "",
	mileage: "",
	imageUrl: "",
};

export const MIN_YEAR = 1886;
export const MAX_PRICE = 9_999_999_999;
export const MAX_MILEAGE = 2_000_000;

function requiredText(label: string, max: number) {
	return z
		.string()
		.trim()
		.min(1, `Informe ${label}.`)
		.max(max, `Use no máximo ${max} caracteres.`);
}

function integerField(label: string, min: number, max: number, minMessage: string, maxMessage: string) {
	return z
		.string()
		.trim()
		.min(1, `Informe ${label}.`)
		.regex(/^\d+$/, "Use apenas dígitos.")
		.transform(Number)
		.pipe(z.number().int().min(min, minMessage).max(max, maxMessage));
}

function isHttpUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
}

export function buildCarFormSchema(currentYear: number = new Date().getFullYear()) {
	const maxYear = currentYear + 1;
	return z.object({
		brand: requiredText("a marca", 80),
		model: requiredText("o modelo", 120),
		version: z.string().trim().max(120, "Use no máximo 120 caracteres."),
		year: integerField("o ano", MIN_YEAR, maxYear, `O ano deve ser ${MIN_YEAR} ou posterior.`, `O ano deve ser no máximo ${maxYear}.`),
		price: integerField(
			"o preço",
			1,
			MAX_PRICE,
			"O preço deve ser maior que zero.",
			"O preço deve ser no máximo R$ 9.999.999.999.",
		),
		fuel: requiredText("o combustível", 30),
		transmission: requiredText("o câmbio", 30),
		mileage: integerField(
			"a quilometragem",
			0,
			MAX_MILEAGE,
			"A quilometragem não pode ser negativa.",
			"A quilometragem deve ser no máximo 2.000.000 km.",
		),
		imageUrl: z
			.string()
			.trim()
			.max(2048, "Use no máximo 2048 caracteres.")
			.refine((v) => v === "" || isHttpUrl(v), "Use um endereço http:// ou https:// válido."),
	});
}

export const carFormSchema = buildCarFormSchema();

export type ParsedCarForm = z.output<typeof carFormSchema>;

export type ValidationResult = { ok: true; input: CarInput } | { ok: false; errors: FieldErrors };

function isFieldName(value: unknown): value is FieldName {
	return typeof value === "string" && (FIELD_NAMES as readonly string[]).includes(value);
}

export function validateCarForm(values: FormValues, schema = carFormSchema): ValidationResult {
	const result = schema.safeParse(values);
	if (!result.success) {
		const errors: FieldErrors = {};
		for (const issue of result.error.issues) {
			const key = issue.path[0];
			if (isFieldName(key) && !errors[key]) errors[key] = issue.message;
		}
		return { ok: false, errors };
	}
	const { version, imageUrl, ...rest } = result.data;
	return {
		ok: true,
		input: { ...rest, ...(version ? { version } : {}), ...(imageUrl ? { imageUrl } : {}) },
	};
}

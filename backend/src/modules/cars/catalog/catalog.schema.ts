import { z } from "zod";

const positiveQueryInteger = z.string()
	.regex(/^[0-9]+$/)
	.transform(Number)
	.pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER));

const nonNegativeQueryInteger = z.string()
	.regex(/^[0-9]+$/)
	.transform(Number)
	.pipe(z.number().int().min(0).max(Number.MAX_SAFE_INTEGER));

// Evaluated per request, so the limit follows the current year.
const queryYear = nonNegativeQueryInteger.pipe(
	z.number().min(1886).refine((year) => year <= new Date().getFullYear() + 1),
);
const queryMileage = nonNegativeQueryInteger.pipe(z.number().max(2_000_000));
const queryPrice = positiveQueryInteger.pipe(z.number().max(9_999_999_999));

const rangeOrdered = (min: number | undefined, max: number | undefined) =>
	min === undefined || max === undefined || min <= max;

export const catalogQuerySchema = z.strictObject({
	page: positiveQueryInteger.default(1),
	pageSize: positiveQueryInteger.pipe(z.number().max(100)).default(12),
	brand: z.string().trim().min(1).max(80).optional(),
	model: z.string().trim().min(1).max(120).optional(),
	version: z.string().trim().min(1).max(120).optional(),
	yearMin: queryYear.optional(),
	yearMax: queryYear.optional(),
	mileageMin: queryMileage.optional(),
	mileageMax: queryMileage.optional(),
	priceMin: queryPrice.optional(),
	priceMax: queryPrice.optional(),
}).refine((query) => rangeOrdered(query.yearMin, query.yearMax), {
	message: "yearMin must not exceed yearMax",
	path: ["yearMin"],
}).refine((query) => rangeOrdered(query.mileageMin, query.mileageMax), {
	message: "mileageMin must not exceed mileageMax",
	path: ["mileageMin"],
}).refine((query) => rangeOrdered(query.priceMin, query.priceMax), {
	message: "priceMin must not exceed priceMax",
	path: ["priceMin"],
}).refine((query) => Number.isSafeInteger((query.page - 1) * query.pageSize), {
	message: "Pagination offset exceeds the supported range",
	path: ["page"],
});

export const catalogIdSchema = z.object({ id: z.uuid() });
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
export type CatalogFilters = Omit<CatalogQuery, "page" | "pageSize">;

import { and, gte, ilike, lte, type SQL } from "drizzle-orm";
import { cars } from "../../../db/schema/cars.js";
import type { CatalogQuery } from "./catalog.schema.js";

export function buildCatalogWhere(query: CatalogQuery) {
	const conditions: SQL[] = [];
	for (const key of ["brand", "model", "version"] as const) {
		const value = query[key];
		if (value) {
			// PostgreSQL LIKE uses backslash as its default escape character.
			const escaped = value.replace(/[\\%_]/g, "\\$&");
			conditions.push(ilike(cars[key], `%${escaped}%`));
		}
	}
	// Bounds are inclusive; NULL mileage fails both comparisons and is excluded.
	if (query.yearMin !== undefined) conditions.push(gte(cars.year, query.yearMin));
	if (query.yearMax !== undefined) conditions.push(lte(cars.year, query.yearMax));
	if (query.mileageMin !== undefined) conditions.push(gte(cars.mileage, query.mileageMin));
	if (query.mileageMax !== undefined) conditions.push(lte(cars.mileage, query.mileageMax));
	// price is numeric(12,2): compare against the decimal text.
	if (query.priceMin !== undefined) conditions.push(gte(cars.price, String(query.priceMin)));
	if (query.priceMax !== undefined) conditions.push(lte(cars.price, String(query.priceMax)));
	return and(...conditions);
}

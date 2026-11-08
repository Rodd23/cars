import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { PgDialect } from "drizzle-orm/pg-core";
import { catalogRoutes } from "../src/modules/cars/catalog/catalog.routes.js";
import { buildCatalogWhere } from "../src/modules/cars/catalog/catalog-query-builder.js";
import { catalogQuerySchema } from "../src/modules/cars/catalog/catalog.schema.js";
import type { CatalogCar, CatalogRepository } from "../src/modules/cars/catalog/catalog.service.js";

const car: CatalogCar = {
	id: "8aa4c34b-850a-4e94-af03-a522df2f4535",
	brand: "Fiat", model: "Uno", version: null, year: 2020,
	price: "50000.00", fuel: null, transmission: null, mileage: 0,
	imageUrl: null, createdAt: new Date("2026-01-01T00:00:00Z"),
	updatedAt: new Date("2026-01-02T00:00:00Z"),
};

function repository(overrides: Partial<CatalogRepository> = {}): CatalogRepository {
	return {
		listCars: async () => ({ items: [car], totalItems: 1 }),
		findCarById: async () => car,
		...overrides,
	};
}

async function buildTestApp(repo = repository()) {
	const app = Fastify();
	await app.register(catalogRoutes, { repository: repo });
	return app;
}

test("list defaults preserve decimal price, nulls, zero mileage and UTC timestamps", async (t) => {
	const app = await buildTestApp(repository({ listCars: async (query) => {
		assert.deepEqual(query, { page: 1, pageSize: 12 });
		return { items: [car], totalItems: 13 };
	} }));
	t.after(() => app.close());
	const response = await app.inject({ method: "GET", url: "/cars" });
	assert.equal(response.statusCode, 200);
	assert.deepEqual(response.json(), {
		items: [{ ...car, createdAt: car.createdAt.toISOString(), updatedAt: car.updatedAt.toISOString() }],
		pagination: { page: 1, pageSize: 12, totalItems: 13, totalPages: 2 },
	});
});

test("query rejects invalid pagination, duplicate values, empty filters and unknown keys before DB", async (t) => {
	const app = await buildTestApp(repository({ listCars: async () => { throw new Error("Must not query"); } }));
	t.after(() => app.close());
	for (const query of ["page=", "page=0", "page=-1", "page=1.5", "page=1e2", "page=Infinity",
		"pageSize=101", "pageSize=0", "page=1&page=2", "brand=", "brand=%20", "other=value",
		"page=9007199254740991&pageSize=100", `model=${"x".repeat(121)}`]) {
		const response = await app.inject({ method: "GET", url: `/cars?${query}` });
		assert.equal(response.statusCode, 400, query);
		assert.equal(response.json().error.code, "INVALID_REQUEST");
	}
});

test("filters are trimmed and passed together with pagination", async (t) => {
	const app = await buildTestApp(repository({ listCars: async (query) => {
		assert.deepEqual(query, { page: 2, pageSize: 5, brand: "Fiat", model: "Uno", version: "Fire" });
		return { items: [], totalItems: 3 };
	} }));
	t.after(() => app.close());
	const response = await app.inject({ method: "GET", url: "/cars?page=2&pageSize=5&brand=%20Fiat%20&model=Uno&version=Fire" });
	assert.equal(response.statusCode, 200);
	assert.deepEqual(response.json(), { items: [], pagination: { page: 2, pageSize: 5, totalItems: 3, totalPages: 1 } });
});

test("empty catalog has zero pages", async (t) => {
	const app = await buildTestApp(repository({ listCars: async () => ({ items: [], totalItems: 0 }) }));
	t.after(() => app.close());
	const response = await app.inject({ method: "GET", url: "/cars" });
	assert.equal(response.json().pagination.totalPages, 0);
});

test("detail distinguishes invalid id, missing vehicle and existing vehicle", async (t) => {
	let calls = 0;
	const app = await buildTestApp(repository({ findCarById: async (id) => {
		calls++;
		return id === car.id ? car : undefined;
	} }));
	t.after(() => app.close());
	assert.equal((await app.inject({ method: "GET", url: "/cars/invalid" })).statusCode, 400);
	assert.equal(calls, 0);
	const missing = await app.inject({ method: "GET", url: "/cars/99a4c34b-850a-4e94-af03-a522df2f4535" });
	assert.equal(missing.statusCode, 404);
	assert.equal(missing.json().error.code, "CAR_NOT_FOUND");
	const found = await app.inject({ method: "GET", url: `/cars/${car.id}` });
	assert.equal(found.statusCode, 200);
	assert.equal(found.json().price, "50000.00");
});

test("DB failures return safe errors for both endpoints", async (t) => {
	const fail = async () => { throw new Error("postgres://secret:password@private SELECT cars"); };
	const app = await buildTestApp(repository({ listCars: fail, findCarById: fail }));
	t.after(() => app.close());
	for (const url of ["/cars", `/cars/${car.id}`]) {
		const response = await app.inject({ method: "GET", url });
		assert.equal(response.statusCode, 500);
		assert.equal(response.json().error.code, "INTERNAL_ERROR");
		assert.doesNotMatch(response.body, /secret|password|SELECT|postgres/);
	}
});

test("SQL is parameterized, combines filters and escapes literal wildcards/backslashes", () => {
	const where = buildCatalogWhere(catalogQuerySchema.parse({ brand: "50%", model: "a_b", version: "x\\y'" }));
	assert.ok(where);
	const compiled = new PgDialect().sqlToQuery(where);
	assert.deepEqual(compiled.params, ["%50\\%%", "%a\\_b%", "%x\\\\y'%"]);
	assert.match(compiled.sql, / and /i);
	assert.doesNotMatch(compiled.sql, /50%|a_b|x\\y/);
	assert.equal(buildCatalogWhere(catalogQuerySchema.parse({})), undefined);
});

const compile = (query: Record<string, string>) => {
	const where = buildCatalogWhere(catalogQuerySchema.parse(query));
	assert.ok(where);
	return new PgDialect().sqlToQuery(where);
};

test("AC1: year, mileage and price ranges are accepted with inclusive bounds and passed to the repository", async (t) => {
	const nextYear = new Date().getFullYear() + 1;
	const received: unknown[] = [];
	const app = await buildTestApp(repository({ listCars: async (query) => {
		received.push(query);
		return { items: [], totalItems: 0 };
	} }));
	t.after(() => app.close());
	const response = await app.inject({ method: "GET", url:
		`/cars?yearMin=1886&yearMax=${nextYear}&mileageMin=0&mileageMax=2000000&priceMin=1&priceMax=9999999999` });
	assert.equal(response.statusCode, 200);
	const exact = await app.inject({ method: "GET", url: "/cars?yearMin=2020&yearMax=2020&mileageMin=5&mileageMax=5" });
	assert.equal(exact.statusCode, 200);
	assert.deepEqual(received, [
		{ page: 1, pageSize: 12, yearMin: 1886, yearMax: nextYear, mileageMin: 0, mileageMax: 2000000, priceMin: 1, priceMax: 9999999999 },
		{ page: 1, pageSize: 12, yearMin: 2020, yearMax: 2020, mileageMin: 5, mileageMax: 5 },
	]);
});

test("AC1: ranges reject min > max, out of range, non-integer and unknown keys with 400 before DB", async (t) => {
	const nextYear = new Date().getFullYear() + 1;
	const app = await buildTestApp(repository({ listCars: async () => { throw new Error("Must not query"); } }));
	t.after(() => app.close());
	for (const query of ["yearMin=2021&yearMax=2020", "mileageMin=10&mileageMax=9", "priceMin=10&priceMax=9",
		"yearMin=1885", `yearMax=${nextYear + 1}`, "mileageMax=2000001", "mileageMin=-1", "priceMin=0",
		"priceMax=10000000000", "yearMin=2020.5", "mileageMax=1e3", "priceMax=abc", "yearMin=", "yearMin=1&yearMin=2",
		"yearFrom=2020"]) {
		const response = await app.inject({ method: "GET", url: `/cars?${query}` });
		assert.equal(response.statusCode, 400, query);
		assert.equal(response.json().error.code, "INVALID_REQUEST");
	}
});

test("AC1/AC2: range SQL is parameterized with gte/lte; mileage filter uses comparison (NULL excluded)", () => {
	const compiled = compile({ yearMin: "2018", yearMax: "2020", mileageMin: "0", mileageMax: "50000", priceMin: "30000", priceMax: "90000" });
	assert.match(compiled.sql, /"year" >= \$1/);
	assert.match(compiled.sql, /"year" <= \$2/);
	assert.match(compiled.sql, /"mileage" >= \$3/);
	assert.match(compiled.sql, /"mileage" <= \$4/);
	assert.match(compiled.sql, /"price" >= \$5/);
	assert.match(compiled.sql, /"price" <= \$6/);
	assert.doesNotMatch(compiled.sql, /is null/i);
	assert.deepEqual(compiled.params, [2018, 2020, 0, 50000, "30000", "90000"]);
});

test("AC10: wildcards coming from the AI are literals alongside ranges", () => {
	const compiled = compile({ brand: "%", model: "_", mileageMax: "10" });
	assert.deepEqual(compiled.params, ["%\\%%", "%\\_%", 10]);
});

import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "../src/app/routes.js";
import type { Car, CarListResponse } from "../src/api/types.js";

export function makeCar(overrides: Partial<Car> = {}): Car {
	return {
		id: "11111111-1111-4111-8111-111111111111",
		brand: "Toyota",
		model: "Corolla",
		version: "XEi",
		year: 2020,
		price: "50000.00",
		fuel: "Flex",
		transmission: "Automático",
		mileage: 45000,
		imageUrl: "https://img.test/corolla.jpg",
		createdAt: "2024-01-01T00:00:00.000Z",
		updatedAt: "2024-01-01T00:00:00.000Z",
		...overrides,
	};
}

export function makeList(items: Car[], page = 1, totalItems = items.length, pageSize = 12): CarListResponse {
	return {
		items,
		pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
	};
}

export function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export type FetchMock = ReturnType<typeof vi.fn<(url: string, init?: RequestInit) => Promise<Response>>>;

export function mockFetch(handler: (url: URL) => Promise<Response> | Response): FetchMock {
	const fn = vi.fn(async (url: string, _init?: RequestInit) => handler(new URL(url)));
	vi.stubGlobal("fetch", fn);
	return fn;
}

export function requestedUrls(fn: FetchMock): URL[] {
	return fn.mock.calls.map((c) => new URL(c[0]));
}

export function renderApp(initialEntry: string) {
	const router = createMemoryRouter(routes, { initialEntries: [initialEntry] });
	const utils = render(<RouterProvider router={router} />);
	return { router, ...utils };
}

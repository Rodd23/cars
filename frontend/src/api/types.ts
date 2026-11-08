export type Car = {
	id: string;
	brand: string;
	model: string;
	version: string | null;
	year: number;
	price: string;
	fuel: string | null;
	transmission: string | null;
	mileage: number | null;
	imageUrl: string | null;
	createdAt: string;
	updatedAt: string;
};

export type Pagination = {
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
};

export type CarListResponse = {
	items: Car[];
	pagination: Pagination;
};

export type CarListQuery = {
	page: number;
	pageSize: number;
	brand?: string;
	model?: string;
	version?: string;
	yearMin?: string;
	yearMax?: string;
	mileageMin?: string;
	mileageMax?: string;
	priceMin?: string;
	priceMax?: string;
};

/** Filtros devolvidos por POST /cars/search (mesmos nomes da query de GET /cars). */
export type SearchFilters = {
	brand?: string;
	model?: string;
	version?: string;
	yearMin?: number;
	yearMax?: number;
	mileageMin?: number;
	mileageMax?: number;
	priceMin?: number;
	priceMax?: number;
};

export type SearchResponse = CarListResponse & {
	filters: SearchFilters;
	ignored: string[];
};

export type AuthUser = {
	id: string;
	email: string;
	name: string;
};

export type ApiFieldError = {
	path: string;
	message: string;
};

export type CarInput = {
	brand: string;
	model: string;
	version?: string;
	year: number;
	price: number;
	fuel: string;
	transmission: string;
	mileage: number;
	imageUrl?: string;
};

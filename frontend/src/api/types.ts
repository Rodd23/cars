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
};

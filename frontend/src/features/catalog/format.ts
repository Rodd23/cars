const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const integer = new Intl.NumberFormat("pt-BR");

export function formatPrice(price: string): string {
	// Intl.NumberFormat aceita string decimal exata em runtimes modernos.
	return currency.format(price as unknown as number);
}

export function formatMileage(mileage: number | null): string {
	return mileage === null ? "Não informada" : `${integer.format(mileage)} km`;
}

export function formatOptional(value: string | null): string {
	return value && value.trim() !== "" ? value : "Não informado";
}

export function carTitle(car: { brand: string; model: string }): string {
	return `${car.brand} ${car.model}`;
}

export function carImageAlt(car: { brand: string; model: string; year: number }): string {
	return `Foto do ${car.brand} ${car.model} ${car.year}`;
}

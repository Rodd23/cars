const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const integer = new Intl.NumberFormat("pt-BR");

export function formatPrice(price: string): string {
	// Intl.NumberFormat aceita string decimal exata em runtimes modernos.
	return currency.format(price as unknown as number);
}

export function formatMileage(mileage: number | null): string {
	return mileage === null ? "Não informada" : `${integer.format(mileage)} km`;
}

export function formatCount(count: number, singular: string, plural: string): string {
	return `${integer.format(count)} ${count === 1 ? singular : plural}`;
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

export type RangeKey = "year" | "mileage" | "price";

const RANGE_KEYS: Record<RangeKey, [min: string, max: string]> = {
	year: ["yearMin", "yearMax"],
	mileage: ["mileageMin", "mileageMax"],
	price: ["priceMin", "priceMax"],
};

export function rangeFilterKeys(range: RangeKey): [string, string] {
	return RANGE_KEYS[range];
}

/** Texto legível de uma faixa ("2018–2020", "até 50.000 km"); null quando vazia. */
export function formatRange(range: RangeKey, min: string, max: string): string | null {
	const fmt = (v: string) =>
		range === "year" ? v : range === "mileage" ? formatMileage(Number(v)) : formatPriceWhole(`${Number(v)}`);
	const bare = (v: string) => (range === "mileage" ? integer.format(Number(v)) : fmt(v));
	if (min && max) {
		if (min === max) return fmt(min);
		return `${bare(min)}–${fmt(max)}`;
	}
	if (min) return `a partir de ${fmt(min)}`;
	if (max) return `até ${fmt(max)}`;
	return null;
}

const currencyWhole = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/** Preço sem centavos para os cards ("R$ 189.900"); os detalhes continuam com formatPrice. */
export function formatPriceWhole(price: string): string {
	return currencyWhole.format(price as unknown as number);
}

const dateFormat = new Intl.DateTimeFormat("pt-BR");

/** Data curta (dd/mm/aaaa) de um timestamp ISO; vazio se inválido. */
export function formatDate(iso: string): string {
	const date = new Date(iso);
	return Number.isNaN(date.getTime()) ? "" : dateFormat.format(date);
}

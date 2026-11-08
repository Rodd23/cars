import { Calendar, Cog, Fuel, Gauge, type LucideIcon } from "lucide-react";
import { Link } from "react-router";
import type { Car } from "../../api/types.js";
import { CarImage } from "../../components/CarImage.js";
import { Skeleton } from "../../components/ui/skeleton.js";
import { carImageAlt, carTitle, formatPriceWhole } from "./format.js";

type Props = {
	car: Car;
	catalogSearch: string;
	eager?: boolean;
	/** Pré-visualização (cadastro): mesmo visual, sem link e sem foco. */
	preview?: boolean;
};

const integer = new Intl.NumberFormat("pt-BR");

/** Metadados do card; valores nulos ou vazios são omitidos. */
function metadata(car: Car): { Icon: LucideIcon; text: string }[] {
	const items: { Icon: LucideIcon; text: string | null }[] = [
		{ Icon: Calendar, text: car.year ? String(car.year) : null },
		{ Icon: Gauge, text: car.mileage === null ? null : `${integer.format(car.mileage)} km` },
		{ Icon: Fuel, text: car.fuel },
		{ Icon: Cog, text: car.transmission },
	];
	return items.filter((i): i is { Icon: LucideIcon; text: string } => i.text !== null && i.text.trim() !== "");
}

export function CarCard({ car, catalogSearch, eager = false, preview = false }: Props) {
	return (
		<li className="group relative flex min-w-0 list-none flex-col overflow-hidden rounded-xl border border-line bg-surface transition-[transform,box-shadow,border-color] duration-200 ease-out-quint hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring max-[479px]:grid max-[479px]:grid-cols-[120px_minmax(0,1fr)]">
			<div className="grid aspect-[4/3] place-items-center overflow-hidden bg-placeholder max-[479px]:aspect-auto max-[479px]:h-full">
				<CarImage
					imageUrl={car.imageUrl}
					alt={preview ? "Pré-visualização da imagem do veículo" : carImageAlt(car)}
					lazy={!eager}
					className="aspect-auto size-full object-cover transition-transform duration-500 ease-out-quint group-hover:scale-[1.04]"
				/>
			</div>
			<div className="flex min-w-0 flex-1 flex-col p-4 max-[479px]:p-3">
				<h2 className="truncate text-base font-semibold leading-snug tracking-[-0.01em]">
					{/* O pseudo-elemento do link cobre o card inteiro (área clicável única). */}
					{preview ? (
						<span>{carTitle(car)}</span>
					) : (
						<Link
							to={`/cars/${car.id}`}
							state={{ catalogSearch }}
							className="text-ink after:absolute after:inset-0 focus:outline-none"
						>
							{carTitle(car)}
						</Link>
					)}
				</h2>
				{/* Reserva a altura da linha mesmo sem versão. */}
				<p className="mt-0.5 min-h-5 truncate text-sm text-ink-subtle">{car.version ?? ""}</p>
				<p className="num mt-3 text-xl font-semibold tracking-[-0.01em] max-[479px]:mt-1.5 max-[479px]:text-[17px]">
					{/* Preço vazio só ocorre na pré-visualização do cadastro. */}
					{car.price === "" ? "R$ —" : formatPriceWhole(car.price)}
				</p>
				<ul className="num mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-line pt-3 text-[13px] text-ink-subtle max-[479px]:mt-1.5 max-[479px]:border-0 max-[479px]:pt-0">
					{metadata(car).map(({ Icon, text }, index) => (
						<li key={index} className="inline-flex items-center gap-1">
							<Icon aria-hidden="true" className="size-3.5 shrink-0" />
							{text}
						</li>
					))}
				</ul>
			</div>
		</li>
	);
}

export function CarCardSkeleton() {
	return (
		<li
			className="flex min-w-0 list-none flex-col overflow-hidden rounded-xl border border-line bg-surface max-[479px]:grid max-[479px]:grid-cols-[120px_minmax(0,1fr)]"
			aria-hidden="true"
		>
			<Skeleton className="aspect-[4/3] rounded-none bg-placeholder max-[479px]:aspect-auto max-[479px]:h-full max-[479px]:min-h-24" />
			<div className="flex min-w-0 flex-col gap-2 p-4 max-[479px]:p-3">
				<Skeleton className="h-4 w-3/4" />
				<Skeleton className="h-3.5 w-1/2" />
				<Skeleton className="mt-1 h-5 w-3/5" />
				<Skeleton className="h-3.5 w-4/5" />
			</div>
		</li>
	);
}

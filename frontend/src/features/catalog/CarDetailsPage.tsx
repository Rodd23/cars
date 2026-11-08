import { ArrowLeft, Calendar, ChevronRight, Cog, Fuel, Gauge, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { ApiError, getCar, isAbortError } from "../../api/client.js";
import type { Car } from "../../api/types.js";
import { useDocumentTitle } from "../../app/documentTitle.js";
import { CarImage } from "../../components/CarImage.js";
import { Badge } from "../../components/ui/badge.js";
import { buttonVariants } from "../../components/ui/button.js";
import { ErrorMessage, Loading, Message } from "../../components/States.js";
import { carImageAlt, carTitle, formatDate, formatMileage, formatOptional, formatPrice } from "./format.js";

type State = { status: "loading" } | { status: "error" } | { status: "notFound" } | { status: "success"; car: Car };

function catalogPath(state: unknown): string {
	const s = (state as { catalogSearch?: unknown } | null)?.catalogSearch;
	return `/cars${typeof s === "string" && s.startsWith("?") ? s : ""}`;
}

function pageTitle(state: State): string {
	if (state.status === "success") return `${carTitle(state.car)} ${state.car.year}`;
	if (state.status === "notFound") return "Veículo não encontrado";
	return "Detalhes do veículo";
}

export function CarDetailsPage() {
	const { id = "" } = useParams();
	const location = useLocation();
	const back = catalogPath(location.state);
	const created = (location.state as { created?: unknown } | null)?.created === true;
	const [state, setState] = useState<State>({ status: "loading" });
	const [attempt, setAttempt] = useState(0);
	useDocumentTitle(pageTitle(state));

	useEffect(() => {
		const controller = new AbortController();
		let active = true;
		setState({ status: "loading" });
		getCar(id, controller.signal)
			.then((car) => {
				if (active) setState({ status: "success", car });
			})
			.catch((error: unknown) => {
				if (!active || isAbortError(error)) return;
				const missing = error instanceof ApiError && (error.status === 404 || error.status === 400);
				setState({ status: missing ? "notFound" : "error" });
			});
		return () => {
			active = false;
			controller.abort();
		};
	}, [id, attempt]);

	const crumb = (current: string) => (
		<nav aria-label="Trilha" className="flex items-center gap-1.5 text-sm text-ink-subtle">
			<Link
				to={back}
				className="-ml-2 inline-flex h-9 items-center gap-1.5 rounded-md px-2 hover:bg-muted hover:text-ink pointer-coarse:h-11"
			>
				<ArrowLeft aria-hidden="true" className="size-4" />
				Catálogo
			</Link>
			<ChevronRight aria-hidden="true" className="size-3.5 shrink-0" />
			<span className="min-w-0 break-words text-ink" aria-current="page">
				{current}
			</span>
		</nav>
	);

	if (state.status === "success") {
		const car = state.car;
		const facts: { Icon: LucideIcon; label: string; value: string; numeric?: boolean }[] = [
			{ Icon: Calendar, label: "Ano", value: String(car.year), numeric: true },
			{ Icon: Gauge, label: "Quilometragem", value: formatMileage(car.mileage), numeric: true },
			{ Icon: Fuel, label: "Combustível", value: formatOptional(car.fuel) },
			{ Icon: Cog, label: "Câmbio", value: formatOptional(car.transmission) },
		];
		const createdOn = formatDate(car.createdAt);
		const updated = formatDate(car.updatedAt);
		return (
			<>
				{crumb(carTitle(car))}
				{created ? (
					<p
						className="mt-4 rounded-lg border border-success bg-surface px-3 py-2 text-sm font-medium text-ink"
						role="status"
					>
						Veículo cadastrado
					</p>
				) : null}
				<article className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-10">
					<div className="aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-placeholder">
						<CarImage
							imageUrl={car.imageUrl}
							alt={carImageAlt(car)}
							className="aspect-auto size-full object-cover"
						/>
					</div>
					<section className="min-w-0 lg:sticky lg:top-20">
						<div className="flex flex-wrap gap-1.5">
							<Badge className="num">{car.year}</Badge>
							{car.fuel && car.fuel.trim() !== "" ? <Badge>{car.fuel}</Badge> : null}
						</div>
						<h1 className="mt-3 break-words text-[30px] font-semibold leading-[1.1] tracking-[-0.025em] md:text-[36px]">
							{carTitle(car)}
						</h1>
						{car.version ? <p className="mt-1.5 break-words text-base text-ink-subtle">{car.version}</p> : null}
						<p className="num mt-6 text-[34px] font-semibold leading-none tracking-[-0.02em] md:text-[40px]">
							{formatPrice(car.price)}
						</p>
						<dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line">
							{facts.map(({ Icon, label, value, numeric }) => (
								<div key={label} className="min-w-0 bg-surface p-4">
									<dt className="flex items-center gap-1.5 text-[13px] font-medium text-ink-subtle">
										<Icon aria-hidden="true" className="size-4 shrink-0" />
										{label}
									</dt>
									<dd className={`mt-1 break-words text-[17px] font-semibold ${numeric ? "num" : ""}`}>{value}</dd>
								</div>
							))}
						</dl>
						{createdOn && updated ? (
							<p className="num mt-5 text-[13px] text-ink-subtle">
								Cadastrado em {createdOn} · atualizado em {updated}
							</p>
						) : null}
					</section>
				</article>
			</>
		);
	}

	let body;
	if (state.status === "loading") body = <Loading label="Carregando veículo…" />;
	else if (state.status === "notFound")
		body = (
			<Message
				title="Veículo não encontrado"
				action={
					<Link to={back} className={buttonVariants({ variant: "outline" })}>
						<ArrowLeft aria-hidden="true" />
						Voltar ao catálogo
					</Link>
				}
			>
				O veículo pode ter sido removido ou o endereço está incorreto.
			</Message>
		);
	else body = <ErrorMessage onRetry={() => setAttempt((n) => n + 1)} />;

	return (
		<>
			{state.status === "notFound" ? null : crumb("Detalhes do veículo")}
			<h1 className="mt-4 text-[24px] font-semibold leading-tight tracking-[-0.02em] md:text-[30px]">Detalhes do veículo</h1>
			<div className="mt-6">{body}</div>
		</>
	);
}

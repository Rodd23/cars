import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { ApiError, getCar, isAbortError } from "../../api/client.js";
import type { Car } from "../../api/types.js";
import { CarImage } from "../../components/CarImage.js";
import { ErrorMessage, Loading, Message } from "../../components/States.js";
import { carImageAlt, carTitle, formatMileage, formatOptional, formatPrice } from "./format.js";
import styles from "./CarDetailsPage.module.css";

type State = { status: "loading" } | { status: "error" } | { status: "notFound" } | { status: "success"; car: Car };

function catalogPath(state: unknown): string {
	const s = (state as { catalogSearch?: unknown } | null)?.catalogSearch;
	return `/cars${typeof s === "string" && s.startsWith("?") ? s : ""}`;
}

export function CarDetailsPage() {
	const { id = "" } = useParams();
	const location = useLocation();
	const back = catalogPath(location.state);
	const [state, setState] = useState<State>({ status: "loading" });
	const [attempt, setAttempt] = useState(0);

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

	const backLink = (
		<Link to={back} className={styles.back}>
			Voltar ao catálogo
		</Link>
	);

	let body;
	if (state.status === "loading") body = <Loading label="Carregando veículo..." />;
	else if (state.status === "notFound")
		body = (
			<Message title="Veículo não encontrado" action={backLink}>
				Não encontramos o veículo solicitado.
			</Message>
		);
	else if (state.status === "error") body = <ErrorMessage onRetry={() => setAttempt((n) => n + 1)} />;
	else {
		const car = state.car;
		body = (
			<article className={styles.article}>
				<CarImage imageUrl={car.imageUrl} alt={carImageAlt(car)} />
				<h2 className={styles.title}>{carTitle(car)}</h2>
				<dl className={styles.list}>
					<dt>Marca</dt>
					<dd>{car.brand}</dd>
					<dt>Modelo</dt>
					<dd>{car.model}</dd>
					<dt>Versão</dt>
					<dd>{formatOptional(car.version)}</dd>
					<dt>Ano</dt>
					<dd>{car.year}</dd>
					<dt>Preço</dt>
					<dd>{formatPrice(car.price)}</dd>
					<dt>Quilometragem</dt>
					<dd>{formatMileage(car.mileage)}</dd>
					<dt>Combustível</dt>
					<dd>{formatOptional(car.fuel)}</dd>
					<dt>Transmissão</dt>
					<dd>{formatOptional(car.transmission)}</dd>
				</dl>
			</article>
		);
	}

	return (
		<main className="container">
			<h1>Detalhes do veículo</h1>
			{state.status === "notFound" ? null : <p>{backLink}</p>}
			{body}
		</main>
	);
}

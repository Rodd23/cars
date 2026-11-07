import { useEffect, useState } from "react";
import { isAbortError, listCars } from "../../api/client.js";
import type { CarListResponse } from "../../api/types.js";
import { ErrorMessage, Loading, Message } from "../../components/States.js";
import { CarCard } from "./CarCard.js";
import { CatalogFilters } from "./CatalogFilters.js";
import { Pagination } from "./Pagination.js";
import { PAGE_SIZE, useCatalogQuery, type Filters } from "./useCatalogQuery.js";
import styles from "./CatalogPage.module.css";

type State =
	| { status: "loading" }
	| { status: "error" }
	| { status: "success"; data: CarListResponse };

const EMPTY: Filters = { brand: "", model: "", version: "" };

export function CatalogPage() {
	const { filters, page, hasFilters, apply, toSearch } = useCatalogQuery();
	const [state, setState] = useState<State>({ status: "loading" });
	const [attempt, setAttempt] = useState(0);
	const { brand, model, version } = filters;

	useEffect(() => {
		const controller = new AbortController();
		let active = true;
		setState({ status: "loading" });
		listCars({ page, pageSize: PAGE_SIZE, brand, model, version }, controller.signal)
			.then((data) => {
				if (active) setState({ status: "success", data });
			})
			.catch((error: unknown) => {
				if (!active || isAbortError(error)) return;
				setState({ status: "error" });
			});
		return () => {
			active = false;
			controller.abort();
		};
	}, [brand, model, version, page, attempt]);

	const loading = state.status === "loading";
	const catalogSearch = toSearch(filters, page);

	function content() {
		if (state.status === "loading") return <Loading label="Carregando veículos..." />;
		if (state.status === "error") return <ErrorMessage onRetry={() => setAttempt((n) => n + 1)} />;
		const { items, pagination } = state.data;
		if (items.length === 0) {
			if (pagination.totalItems > 0) {
				return (
					<Message
						title="Página fora do intervalo"
						action={
							<button type="button" className="button" onClick={() => apply(filters, 1)}>
								Ir para a primeira página
							</button>
						}
					>
						Esta página não existe para a busca atual.
					</Message>
				);
			}
			if (hasFilters) {
				return (
					<Message
						title="Nenhum veículo encontrado"
						action={
							<button type="button" className="button" onClick={() => apply(EMPTY, 1)}>
								Limpar filtros
							</button>
						}
					>
						Nenhum resultado para os filtros informados.
					</Message>
				);
			}
			return <Message title="Nenhum veículo cadastrado">O catálogo ainda não possui veículos.</Message>;
		}
		return (
			<>
				<ul className={styles.grid}>
					{items.map((car) => (
						<CarCard key={car.id} car={car} catalogSearch={catalogSearch} />
					))}
				</ul>
				<Pagination pagination={pagination} onPage={(p) => apply(filters, p)} />
			</>
		);
	}

	return (
		<main className="container">
			<h1>Catálogo de veículos</h1>
			<CatalogFilters filters={filters} loading={loading} onSearch={(f) => apply(f, 1)} onClear={() => apply(EMPTY, 1)} />
			{content()}
		</main>
	);
}

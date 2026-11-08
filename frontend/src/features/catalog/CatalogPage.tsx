import { useEffect, useRef, useState } from "react";
import { isAbortError, listCars } from "../../api/client.js";
import type { CarListResponse } from "../../api/types.js";
import { useDocumentTitle } from "../../app/documentTitle.js";
import { ErrorMessage, Message } from "../../components/States.js";
import { Button } from "../../components/ui/button.js";
import { CarCard, CarCardSkeleton } from "./CarCard.js";
import { CatalogFilters } from "./CatalogFilters.js";
import { Pagination } from "./Pagination.js";
import { ResultsBar } from "./ResultsBar.js";
import { SmartSearch } from "./SmartSearch.js";
import { EMPTY_FILTERS, PAGE_SIZE, useCatalogQuery } from "./useCatalogQuery.js";

type Status = "loading" | "error" | "success";

/** Cards carregados sem lazy: cobre a primeira linha em qualquer largura. */
const EAGER_CARDS = 4;

const GRID = "m-0 grid list-none grid-cols-1 gap-4 p-0 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";

export function CatalogPage() {
	useDocumentTitle();
	const { filters, page, hasFilters, apply, toSearch } = useCatalogQuery();
	const [status, setStatus] = useState<Status>("loading");
	// Último resultado recebido: permanece visível (esmaecido) durante a próxima consulta.
	const [data, setData] = useState<CarListResponse | null>(null);
	const [attempt, setAttempt] = useState(0);
	const focusResults = useRef(false);
	const resultsRef = useRef<HTMLParagraphElement>(null);

	useEffect(() => {
		const controller = new AbortController();
		let active = true;
		setStatus("loading");
		listCars({ page, pageSize: PAGE_SIZE, ...filters }, controller.signal)
			.then((response) => {
				if (!active) return;
				setData(response);
				setStatus("success");
			})
			.catch((error: unknown) => {
				if (!active || isAbortError(error)) return;
				setStatus("error");
			});
		return () => {
			active = false;
			controller.abort();
		};
	}, [filters, page, attempt]);

	// Após Anterior/Próxima, o botão acionado pode desaparecer; o foco vai para a contagem.
	useEffect(() => {
		if (status === "loading" || !focusResults.current) return;
		focusResults.current = false;
		(resultsRef.current ?? document.getElementById("conteudo"))?.focus();
	}, [status, data]);

	const loading = status === "loading";
	const catalogSearch = toSearch(filters, page);

	function goToPage(p: number) {
		focusResults.current = true;
		apply(filters, p);
	}

	function content() {
		if (status === "error") return <ErrorMessage onRetry={() => setAttempt((n) => n + 1)} />;
		// Sem resultados anteriores para manter na tela: skeleton com o mesmo tamanho da grade.
		if (data === null || (loading && data.items.length === 0)) {
			return (
				<div role="status" aria-busy="true">
					<span className="sr-only">Carregando veículos…</span>
					<ul className={GRID}>
						{Array.from({ length: PAGE_SIZE }, (_, i) => (
							<CarCardSkeleton key={i} />
						))}
					</ul>
				</div>
			);
		}
		const { items, pagination } = data;
		if (items.length === 0) {
			if (pagination.totalItems > 0) {
				return (
					<Message
						title="Página fora do intervalo"
						action={
							<Button onClick={() => apply(filters, 1)}>Ir para a primeira página</Button>
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
							<Button onClick={() => apply(EMPTY_FILTERS, 1)}>Limpar filtros</Button>
						}
					>
						Nenhum resultado para os filtros informados. Revise a grafia ou remova um filtro.
					</Message>
				);
			}
			return <Message title="Nenhum veículo cadastrado">O catálogo ainda não possui veículos.</Message>;
		}
		return (
			<div className={loading ? "opacity-60 transition-opacity duration-150" : undefined} aria-busy={loading}>
				<ResultsBar
					ref={resultsRef}
					totalItems={pagination.totalItems}
					filters={filters}
					onRemove={(keys) => apply({ ...filters, ...Object.fromEntries(keys.map((k) => [k, ""])) }, 1)}
					onClear={() => apply(EMPTY_FILTERS, 1)}
				/>
				<ul className={`mt-5 ${GRID}`}>
					{items.map((car, index) => (
						<CarCard key={car.id} car={car} catalogSearch={catalogSearch} eager={index < EAGER_CARDS} />
					))}
				</ul>
				<Pagination pagination={pagination} onPage={goToPage} />
			</div>
		);
	}

	return (
		<>
			<h1 className="text-[24px] font-semibold leading-tight tracking-[-0.02em] md:text-[30px]">Catálogo de veículos</h1>
			<SmartSearch />
			<CatalogFilters filters={filters} loading={loading} onSearch={(f) => apply(f, 1)} />
			<div className="mt-6">{content()}</div>
		</>
	);
}

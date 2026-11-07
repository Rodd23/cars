import type { Pagination as PaginationData } from "../../api/types.js";
import styles from "./Pagination.module.css";

type Props = { pagination: PaginationData; onPage: (page: number) => void };

export function Pagination({ pagination, onPage }: Props) {
	const { page, totalPages, totalItems } = pagination;
	return (
		<nav className={styles.nav} aria-label="Paginação">
			<button type="button" className="button buttonSecondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
				Anterior
			</button>
			<span>
				Página {page} de {totalPages} &middot; {totalItems} {totalItems === 1 ? "resultado" : "resultados"}
			</span>
			<button
				type="button"
				className="button buttonSecondary"
				disabled={page >= totalPages}
				onClick={() => onPage(page + 1)}
			>
				Próxima
			</button>
		</nav>
	);
}

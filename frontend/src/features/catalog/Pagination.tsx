import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Pagination as PaginationData } from "../../api/types.js";
import { Button } from "../../components/ui/button.js";
import { cn } from "../../lib/cn.js";

type Props = { pagination: PaginationData; onPage: (page: number) => void };

export type PageItem = number | "ellipsis-start" | "ellipsis-end";

/**
 * Sequência de páginas a exibir: todas até 7; acima disso, primeira, última, atual
 * e vizinhas, com reticências nos intervalos omitidos.
 */
export function pageSequence(page: number, totalPages: number): PageItem[] {
	if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
	const shown = new Set([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages));
	const pages = [...shown].sort((a, b) => a - b);
	const items: PageItem[] = [];
	pages.forEach((p, i) => {
		const previous = pages[i - 1];
		if (previous !== undefined && p - previous > 1) items.push(i < pages.length / 2 ? "ellipsis-start" : "ellipsis-end");
		items.push(p);
	});
	return items;
}

export function Pagination({ pagination, onPage }: Props) {
	const { page, totalPages } = pagination;
	// Abaixo de 640px: Anterior, "Página X de Y" e Próxima numa linha; os números aparecem a partir de sm.
	return (
		<nav
			className="mt-10 grid grid-cols-[auto_1fr_auto] items-center gap-1 sm:flex sm:justify-between sm:gap-4"
			aria-label="Paginação"
		>
			<p className="num col-start-2 row-start-1 text-center text-sm text-ink-subtle sm:text-left">
				Página {page} de {totalPages}
			</p>
			<div className="contents sm:flex sm:items-center sm:gap-1">
				<Button
					variant="ghost"
					className="col-start-1 row-start-1"
					disabled={page <= 1}
					onClick={() => onPage(page - 1)}
				>
					<ChevronLeft aria-hidden="true" />
					Anterior
				</Button>
				<div className="hidden items-center gap-1 sm:flex">
					{pageSequence(page, totalPages).map((item) =>
						typeof item === "string" ? (
							<span key={item} aria-hidden="true" className="grid size-10 place-items-center text-ink-subtle">
								…
							</span>
						) : (
							<Button
								key={item}
								variant={item === page ? "outline" : "ghost"}
								size="icon"
								className={cn("num", item === page && "border-line-strong")}
								aria-label={`Página ${item}`}
								{...(item === page ? { "aria-current": "page" as const } : {})}
								onClick={() => (item === page ? undefined : onPage(item))}
							>
								{item}
							</Button>
						),
					)}
				</div>
				<Button
					variant="ghost"
					className="col-start-3 row-start-1"
					disabled={page >= totalPages}
					onClick={() => onPage(page + 1)}
				>
					Próxima
					<ChevronRight aria-hidden="true" />
				</Button>
			</div>
		</nav>
	);
}

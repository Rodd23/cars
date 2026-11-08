import { X } from "lucide-react";
import type { Ref } from "react";
import { filterChips } from "./chips.js";
import { formatCount } from "./format.js";
import type { Filters } from "./useCatalogQuery.js";

type Props = {
	totalItems: number;
	filters: Filters;
	onRemove: (keys: (keyof Filters)[]) => void;
	onClear: () => void;
	ref?: Ref<HTMLParagraphElement>;
};

export function ResultsBar({ totalItems, filters, onRemove, onClear, ref }: Props) {
	const active = filterChips(filters);
	return (
		<div className="flex flex-wrap items-center gap-2 border-t border-line pt-5">
			{/* Recebe o foco após a paginação; aria-live anuncia a nova contagem. */}
			<p ref={ref} tabIndex={-1} className="num mr-2 rounded-md text-sm text-ink-subtle" aria-live="polite">
				{formatCount(totalItems, "veículo", "veículos")}
			</p>
			{active.length > 0 ? (
				<>
					<ul className="m-0 flex min-w-0 list-none flex-wrap gap-2 p-0" aria-label="Filtros aplicados">
						{active.map((chip) => (
							<li
								key={chip.id}
								className="inline-flex h-8 min-w-0 max-w-full items-center gap-1.5 rounded-full bg-primary-soft pl-3 pr-1 text-[13px] font-medium text-primary-soft-ink"
							>
								<span className="truncate">{chip.label}</span>
								<button
									type="button"
									className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-primary-soft pointer-coarse:size-11"
									aria-label={`Remover filtro ${chip.label}`}
									onClick={() => onRemove(chip.keys)}
								>
									<X aria-hidden="true" className="size-3.5" />
								</button>
							</li>
						))}
					</ul>
					<button
						type="button"
						className="h-8 cursor-pointer rounded-md px-2 text-[13px] font-medium text-link hover:bg-muted pointer-coarse:h-11"
						onClick={onClear}
					>
						Limpar filtros
					</button>
				</>
			) : null}
		</div>
	);
}

import { ChevronDown, Search } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "../../components/ui/button.js";
import { Input } from "../../components/ui/input.js";
import { Label } from "../../components/ui/label.js";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover.js";
import { cn } from "../../lib/cn.js";
import { useMediaQuery } from "../../lib/useMediaQuery.js";
import { formatRange, rangeFilterKeys, type RangeKey } from "./format.js";
import { validateNumericFilters, type FilterErrors } from "./filtersSchema.js";
import type { Filters } from "./useCatalogQuery.js";

type Props = {
	filters: Filters;
	loading: boolean;
	onSearch: (filters: Filters) => void;
};

type Group = "more" | RangeKey;

const FORM_ID = "catalog-filters";

const GROUP_OF: Partial<Record<keyof Filters, Group>> = {
	yearMin: "year",
	yearMax: "year",
	mileageMin: "mileage",
	mileageMax: "mileage",
	priceMin: "price",
	priceMax: "price",
};

/** Ordem em que o primeiro erro decide qual popover abrir e qual campo receber o foco. */
const ERROR_ORDER: (keyof Filters)[] = ["yearMin", "yearMax", "mileageMin", "mileageMax", "priceMin", "priceMax"];

const SHORTCUTS = {
	mileageMax: [
		{ label: "20 mil", value: "20000" },
		{ label: "50 mil", value: "50000" },
		{ label: "100 mil", value: "100000" },
	],
	priceMax: [
		{ label: "R$ 80 mil", value: "80000" },
		{ label: "R$ 150 mil", value: "150000" },
		{ label: "R$ 250 mil", value: "250000" },
	],
} as const;

const ACTIVE = "border-primary/60 bg-primary-soft text-primary-soft-ink hover:bg-primary-soft";

type FieldOptions = { numeric?: boolean; className?: string; inPopover?: boolean };

export function CatalogFilters({ filters, loading, onSearch }: Props) {
	const [values, setValues] = useState<Filters>(filters);
	const [errors, setErrors] = useState<FilterErrors>({});
	const [open, setOpen] = useState<Group | null>(null);
	const refs = useRef<Partial<Record<keyof Filters, HTMLInputElement | null>>>({});
	const pendingFocus = useRef<keyof Filters | null>(null);
	const wide = useMediaQuery("(min-width: 1024px)");

	useEffect(() => {
		setValues(filters);
		setErrors({});
	}, [filters]);

	// Ao abrir o popover por causa de um erro, o foco vai para o campo inválido (e não para o primeiro).
	function focusInvalid(e: Event) {
		const key = pendingFocus.current;
		pendingFocus.current = null;
		const input = key ? refs.current[key] : null;
		if (!input) return;
		e.preventDefault();
		input.focus();
	}

	/** O fechamento de um popover não pode fechar outro que acabou de abrir (o foco sai do antigo depois do clique). */
	function toggle(group: Group, isOpen: boolean) {
		setOpen((current) => (isOpen ? group : current === group ? null : current));
	}

	function set(key: keyof Filters, value: string) {
		setValues((v) => ({ ...v, [key]: value }));
	}

	function submit(e: FormEvent) {
		e.preventDefault();
		const next: Filters = {
			brand: values.brand.trim(),
			model: values.model.trim(),
			version: values.version.trim(),
			yearMin: values.yearMin.trim(),
			yearMax: values.yearMax.trim(),
			mileageMin: values.mileageMin.trim(),
			mileageMax: values.mileageMax.trim(),
			priceMin: values.priceMin.trim(),
			priceMax: values.priceMax.trim(),
		};
		const found = validateNumericFilters(next);
		setErrors(found);
		const first = ERROR_ORDER.find((key) => found[key as keyof FilterErrors]);
		if (first) {
			// O erro aparece dentro do popover do campo; abre-o e leva o foco até lá.
			const group = GROUP_OF[first];
			if (group && open !== group) {
				pendingFocus.current = first;
				setOpen(group);
			} else {
				refs.current[first]?.focus();
			}
			return;
		}
		setOpen(null);
		onSearch(next);
	}

	function field(key: keyof Filters, label: string, placeholder: string, options: FieldOptions = {}) {
		const error = errors[key as keyof FilterErrors];
		const id = `filter-${key}`;
		return (
			<div className={options.className}>
				<Label htmlFor={id}>{label}</Label>
				<Input
					ref={(el) => {
						refs.current[key] = el;
					}}
					id={id}
					name={key}
					{...(options.inPopover ? { form: FORM_ID } : {})}
					{...(options.numeric ? { inputMode: "numeric" as const } : {})}
					autoComplete="off"
					spellCheck={false}
					placeholder={placeholder}
					value={values[key]}
					aria-invalid={error ? true : undefined}
					aria-describedby={error ? `${id}-error` : undefined}
					className={cn("h-10", options.numeric && "num")}
					onChange={(e) => set(key, e.target.value)}
				/>
				{error ? (
					<p id={`${id}-error`} className="mt-1.5 text-[13px] leading-tight text-danger">
						{error}
					</p>
				) : null}
			</div>
		);
	}

	function rangePopover(range: RangeKey, label: string, title: string, body: ReactNode) {
		const [minKey, maxKey] = rangeFilterKeys(range) as [keyof Filters, keyof Filters];
		const active = formatRange(range, filters[minKey], filters[maxKey]);
		const invalid = Boolean(errors[minKey as keyof FilterErrors] || errors[maxKey as keyof FilterErrors]);
		return (
			<Popover open={open === range} onOpenChange={(o) => toggle(range, o)}>
				<PopoverTrigger asChild>
					<Button variant="outline" className={cn(active && ACTIVE, invalid && "border-danger")}>
						{active ? `${label}: ${active}` : label}
						<ChevronDown aria-hidden="true" />
					</Button>
				</PopoverTrigger>
				<PopoverContent onOpenAutoFocus={focusInvalid}>
					<p className="mb-3 text-sm font-medium">{title}</p>
					{body}
				</PopoverContent>
			</Popover>
		);
	}

	function shortcuts(key: "mileageMax" | "priceMax") {
		return (
			<div className="mt-3 flex flex-wrap gap-1.5">
				{SHORTCUTS[key].map(({ label, value }) => (
					<button
						key={value}
						type="button"
						className="num h-7 cursor-pointer rounded-md bg-muted px-2.5 text-xs text-ink-muted hover:bg-muted-strong pointer-coarse:h-11"
						onClick={() => set(key, value)}
					>
						{label}
					</button>
				))}
			</div>
		);
	}

	return (
		<form
			id={FORM_ID}
			className="mt-6 flex flex-wrap items-end gap-2.5"
			onSubmit={submit}
			aria-label="Filtros do catálogo"
			noValidate
		>
			{field("brand", "Marca", "Ex.: Toyota…", { className: "w-[calc(50%-5px)] sm:w-40" })}
			{field("model", "Modelo", "Ex.: Corolla…", { className: "w-[calc(50%-5px)] sm:w-40" })}
			{wide ? field("version", "Versão", "Ex.: XEi…", { className: "w-36" }) : null}
			<div className="flex flex-wrap gap-2">
				{!wide ? (
					<Popover open={open === "more"} onOpenChange={(o) => toggle("more", o)}>
						<PopoverTrigger asChild>
							<Button variant="outline" className={cn(filters.version && ACTIVE)}>
								Mais filtros
								<ChevronDown aria-hidden="true" />
							</Button>
						</PopoverTrigger>
						<PopoverContent onOpenAutoFocus={focusInvalid}>{field("version", "Versão", "Ex.: XEi…", { inPopover: true })}</PopoverContent>
					</Popover>
				) : null}
				{rangePopover(
					"year",
					"Ano",
					"Ano de fabricação",
					<div className="grid grid-cols-2 gap-2">
						{field("yearMin", "Ano mínimo", "Ex.: 2018…", { numeric: true, inPopover: true })}
						{field("yearMax", "Ano máximo", "Ex.: 2022…", { numeric: true, inPopover: true })}
					</div>,
				)}
				{rangePopover(
					"mileage",
					"Quilometragem",
					"Quilometragem",
					<>
						{field("mileageMax", "Quilometragem máxima (km)", "Ex.: 50000…", { numeric: true, inPopover: true })}
						{shortcuts("mileageMax")}
					</>,
				)}
				{rangePopover(
					"price",
					"Preço",
					"Preço",
					<>
						{field("priceMax", "Preço máximo (R$)", "Ex.: 60000…", { numeric: true, inPopover: true })}
						{shortcuts("priceMax")}
					</>,
				)}
			</div>
			<Button type="submit" className="w-full sm:ml-auto sm:w-auto" disabled={loading} aria-busy={loading}>
				<Search aria-hidden="true" />
				{loading ? "Buscando…" : "Filtrar"}
			</Button>
		</form>
	);
}

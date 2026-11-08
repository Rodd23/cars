import { CircleCheck, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { ApiError, isAbortError, searchCars } from "../../api/client.js";
import type { SearchFilters } from "../../api/types.js";
import { Button } from "../../components/ui/button.js";
import { useAuth } from "../auth/AuthProvider.js";
import { summarizeFilters } from "./chips.js";
import { sanitizeNumericFilters } from "./filtersSchema.js";
import { buildSearch, PAGE_SIZE, type Filters } from "./useCatalogQuery.js";

const MAX_LENGTH = 300;

const SUGGESTIONS = ["SUV automático até R$ 150 mil", "Toyota a partir de 2020", "Hatch com menos de 30 mil km"];

type Notice = { summary: string; ignored: string[] };

/** Aviso enviado via location.state para sobreviver à navegação para /cars?…. */
function readNotice(state: unknown): Notice | null {
	const raw = (state as { smartSearch?: unknown } | null)?.smartSearch;
	if (raw === null || typeof raw !== "object") return null;
	const { summary, ignored } = raw as { summary?: unknown; ignored?: unknown };
	if (typeof summary !== "string") return null;
	return { summary, ignored: Array.isArray(ignored) ? ignored.filter((i): i is string => typeof i === "string") : [] };
}

function toFilters(found: SearchFilters): Filters {
	const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
	const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? String(v) : "");
	return {
		brand: text(found.brand),
		model: text(found.model),
		version: text(found.version),
		...sanitizeNumericFilters({
			yearMin: num(found.yearMin),
			yearMax: num(found.yearMax),
			mileageMin: num(found.mileageMin),
			mileageMax: num(found.mileageMax),
			priceMin: num(found.priceMin),
			priceMax: num(found.priceMax),
		}),
	};
}

function errorMessage(error: unknown): string {
	if (error instanceof ApiError) {
		if (error.serverMessage) return error.serverMessage;
		if (error.kind === "unprocessable") return "Não entendi a busca. Tente citar marca, modelo, ano ou quilometragem.";
		if (error.kind === "unavailable") return "A busca inteligente está indisponível. Use os filtros.";
		if (error.kind === "rate_limited") return "Muitas buscas em pouco tempo. Aguarde um instante e tente novamente.";
		if (error.kind === "network") return "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";
	}
	return "Não foi possível interpretar a busca agora. Use os filtros ou tente novamente.";
}

/** Foco em campo de texto ou controle editável: o atalho "/" não deve roubá-lo. */
function isEditable(element: Element | null): boolean {
	if (!(element instanceof HTMLElement)) return false;
	const tag = element.tagName;
	return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || element.isContentEditable;
}

export function SmartSearch() {
	const { state, expire } = useAuth();
	const navigate = useNavigate();
	const notice = readNotice(useLocation().state);
	const [text, setText] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const sending = useRef(false);
	const controller = useRef<AbortController | null>(null);
	const signedIn = state.status === "user";

	useEffect(() => () => controller.current?.abort(), []);

	// Atalho "/": foca a busca quando o foco não está em um campo editável.
	useEffect(() => {
		if (!signedIn) return;
		function onKeyDown(e: KeyboardEvent) {
			if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
			if (isEditable(document.activeElement)) return;
			e.preventDefault();
			inputRef.current?.focus();
		}
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [signedIn]);

	if (!signedIn) return null;

	async function submit(e: FormEvent) {
		e.preventDefault();
		const search = text.trim();
		if (sending.current || search === "") return;
		sending.current = true;
		setBusy(true);
		setError(null);
		const ctrl = new AbortController();
		controller.current = ctrl;
		try {
			const result = await searchCars({ search, pageSize: PAGE_SIZE }, ctrl.signal);
			const filters = toFilters(result.filters);
			// Os resultados vêm do GET da página; os itens do POST são descartados.
			await navigate(`/cars${buildSearch(filters, 1)}`, {
				state: { smartSearch: { summary: summarizeFilters(filters), ignored: result.ignored } },
			});
		} catch (err) {
			if (isAbortError(err)) return;
			if (err instanceof ApiError && err.kind === "unauthorized") {
				expire();
				return;
			}
			setError(errorMessage(err));
			inputRef.current?.focus();
		} finally {
			sending.current = false;
			if (!ctrl.signal.aborted) setBusy(false);
		}
	}

	return (
		<section className="mt-6">
			<form
				className="relative flex h-16 items-center gap-2 rounded-2xl border border-line-strong bg-surface pl-5 pr-2 shadow-lift transition-[border-color,box-shadow] duration-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring"
				onSubmit={submit}
			>
				<Sparkles aria-hidden="true" className="size-5 shrink-0 text-primary" />
				<label htmlFor="smart-search" className="sr-only">
					Busca inteligente
				</label>
				<input
					ref={inputRef}
					id="smart-search"
					name="smartSearch"
					type="text"
					autoComplete="off"
					maxLength={MAX_LENGTH}
					placeholder="Descreva o carro: BMW até 50 mil km, de 2018 a 2020…"
					value={text}
					aria-invalid={error ? true : undefined}
					aria-describedby={error ? "smart-search-error" : undefined}
					className="h-full min-w-0 flex-1 bg-transparent text-base placeholder:text-ink-subtle focus:outline-none md:text-[17px]"
					onChange={(e) => setText(e.target.value)}
				/>
				<kbd
					aria-hidden="true"
					className="hidden h-6 items-center rounded border border-line px-1.5 text-[11px] text-ink-subtle md:inline-flex"
				>
					/
				</kbd>
				<Button type="submit" className="h-12 rounded-xl px-5" disabled={busy} aria-busy={busy}>
					{busy ? "Interpretando…" : "Buscar"}
				</Button>
			</form>
			<div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
				<span className="text-ink-subtle">Experimente:</span>
				{SUGGESTIONS.map((suggestion) => (
					<button
						key={suggestion}
						type="button"
						className="h-7 cursor-pointer rounded-full border border-line bg-surface px-3 text-ink-muted transition-colors hover:border-line-strong hover:text-ink pointer-coarse:h-11"
						onClick={() => {
							setText(suggestion);
							inputRef.current?.focus();
						}}
					>
						{suggestion}
					</button>
				))}
			</div>
			{error ? (
				<p id="smart-search-error" role="alert" className="mt-4 text-sm text-danger">
					{error}
				</p>
			) : null}
			{notice ? (
				<div role="status" className="mt-4 flex items-start gap-2 text-sm text-ink-muted">
					<CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
					<div>
						<p>Entendi: {notice.summary}</p>
						{notice.ignored.length > 0 ? <p className="text-ink-subtle">Ignorado: {notice.ignored.join(", ")}</p> : null}
					</div>
				</div>
			) : null}
		</section>
	);
}

import { ArrowLeft, Check, ChevronRight, CircleAlert } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { ApiError, createCar } from "../../api/client.js";
import type { Car } from "../../api/types.js";
import { useDocumentTitle } from "../../app/documentTitle.js";
import { Button, buttonVariants } from "../../components/ui/button.js";
import { Input } from "../../components/ui/input.js";
import { Label } from "../../components/ui/label.js";
import { ToggleGroup, ToggleGroupItem } from "../../components/ui/toggle-group.js";
import { cn } from "../../lib/cn.js";
import { useAuth } from "../auth/AuthProvider.js";
import { CarCard } from "../catalog/CarCard.js";
import {
	EMPTY_VALUES,
	FIELD_NAMES,
	validateCarForm,
	type FieldErrors,
	type FieldName,
	type FormValues,
} from "./carFormSchema.js";

export const DRAFT_KEY = "catalog-car-draft";

const FUEL_OPTIONS = ["Flex", "Gasolina", "Etanol", "Diesel", "Elétrico", "Híbrido"];
const TRANSMISSION_OPTIONS = ["Manual", "Automático", "CVT"];
const NUMERIC_FIELDS: readonly FieldName[] = ["year", "price", "mileage"];
/** Campos numéricos exibidos com separador de milhar; o valor guardado e enviado é só dígitos. */
const GROUPED_FIELDS: readonly FieldName[] = ["price", "mileage"];
const GROUP_FIELDS: readonly FieldName[] = ["fuel", "transmission"];
const MAX_DIGITS: Partial<Record<FieldName, number>> = { year: 8, price: 10, mileage: 10 };
const integerFormat = new Intl.NumberFormat("pt-BR");

const LABELS: Record<FieldName, string> = {
	brand: "Marca",
	model: "Modelo",
	version: "Versão (opcional)",
	year: "Ano",
	price: "Preço em reais",
	fuel: "Combustível",
	transmission: "Câmbio",
	mileage: "Quilometragem (km)",
	imageUrl: "URL da imagem (opcional)",
};

function isFieldName(value: string): value is FieldName {
	return (FIELD_NAMES as readonly string[]).includes(value);
}

function loadDraft(): FormValues {
	try {
		const raw = sessionStorage.getItem(DRAFT_KEY);
		if (!raw) return EMPTY_VALUES;
		const parsed = JSON.parse(raw) as Record<string, unknown>;
		const values = { ...EMPTY_VALUES };
		for (const name of FIELD_NAMES) {
			const v = parsed[name];
			if (typeof v === "string") values[name] = v;
		}
		return values;
	} catch {
		return EMPTY_VALUES;
	}
}

function saveDraft(values: FormValues): void {
	try {
		sessionStorage.setItem(DRAFT_KEY, JSON.stringify(values));
	} catch {
		// Sem armazenamento disponível: o rascunho simplesmente não é preservado.
	}
}

function clearDraft(): void {
	try {
		sessionStorage.removeItem(DRAFT_KEY);
	} catch {
		// Ignorado.
	}
}

/** Veículo fictício com os valores atuais do formulário, para o card de pré-visualização. */
function previewCar(values: FormValues, imageUrl: string | null): Car {
	const text = (v: string) => (v.trim() === "" ? null : v.trim());
	return {
		id: "preview",
		brand: values.brand.trim() || "Marca",
		model: values.model.trim() || "Modelo",
		version: text(values.version),
		year: Number(values.year) || 0,
		price: values.price,
		fuel: text(values.fuel),
		transmission: text(values.transmission),
		mileage: values.mileage === "" ? null : Number(values.mileage),
		imageUrl,
		createdAt: "",
		updatedAt: "",
	};
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className="rounded-xl border border-line bg-surface p-5 md:p-6">
			<h2 className="text-base font-semibold">{title}</h2>
			<div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
		</section>
	);
}

export function CarFormPage() {
	useDocumentTitle("Novo veículo");
	const navigate = useNavigate();
	const { expire } = useAuth();
	const [values, setValues] = useState<FormValues>(loadDraft);
	const [errors, setErrors] = useState<FieldErrors>({});
	const [formError, setFormError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const busy = useRef(false);
	const refs = useRef<Partial<Record<FieldName, HTMLElement | null>>>({});

	// O rascunho restaurado já está no estado; remove-o do armazenamento depois de montar.
	useEffect(() => clearDraft(), []);

	function setField(name: FieldName, raw: string) {
		const value = NUMERIC_FIELDS.includes(name) ? raw.replace(/\D/g, "").slice(0, MAX_DIGITS[name]) : raw;
		setValues((v) => ({ ...v, [name]: value }));
	}

	/** Campos de texto recebem o foco direto; nos grupos de opções, o item focável (selecionado ou o primeiro). */
	function focusField(name: FieldName) {
		const el = refs.current[name];
		if (!el) return;
		if (GROUP_FIELDS.includes(name)) el.querySelector<HTMLElement>('[tabindex="0"], button')?.focus();
		else el.focus();
	}

	function showErrors(next: FieldErrors) {
		setErrors(next);
		const first = FIELD_NAMES.find((name) => next[name]);
		if (first) {
			// Aguarda o aria-invalid ser aplicado antes de mover o foco.
			setTimeout(() => focusField(first), 0);
		}
	}

	async function submit(e: FormEvent) {
		e.preventDefault();
		if (busy.current) return;
		setFormError(null);
		const result = validateCarForm(values);
		if (!result.ok) {
			showErrors(result.errors);
			return;
		}
		setErrors({});
		busy.current = true;
		setSubmitting(true);
		try {
			const car = await createCar(result.input);
			clearDraft();
			navigate(`/cars/${encodeURIComponent(car.id)}`, { state: { created: true } });
		} catch (error) {
			busy.current = false;
			setSubmitting(false);
			if (error instanceof ApiError && error.kind === "unauthorized") {
				// Sessão expirada: guarda o rascunho; RequireAuth leva ao login e volta a esta página.
				saveDraft(values);
				expire();
				return;
			}
			if (error instanceof ApiError && error.kind === "validation") {
				const mapped: FieldErrors = {};
				const loose: string[] = [];
				for (const detail of error.details) {
					const key = detail.path.split(".")[0] ?? "";
					if (isFieldName(key)) mapped[key] ??= detail.message;
					else loose.push(detail.message);
				}
				if (Object.keys(mapped).length > 0) showErrors(mapped);
				if (loose.length > 0 || Object.keys(mapped).length === 0) {
					setFormError(loose.length > 0 ? loose.join(" ") : "O servidor recusou os dados informados. Confira os campos.");
				}
				return;
			}
			if (error instanceof ApiError && error.kind === "forbidden") {
				setFormError("O servidor recusou a requisição. Recarregue a página e tente novamente.");
				return;
			}
			setFormError(
				error instanceof ApiError && error.kind === "network"
					? "Não foi possível conectar ao servidor. Seus dados foram mantidos; tente novamente."
					: "Não foi possível cadastrar o veículo agora. Seus dados foram mantidos; tente novamente.",
			);
		}
	}

	const invalid = FIELD_NAMES.filter((name) => errors[name]);
	const trimmedUrl = values.imageUrl.trim();
	const previewUrl =
		trimmedUrl.toLowerCase().startsWith("http://") || trimmedUrl.toLowerCase().startsWith("https://") ? trimmedUrl : null;

	function errorText(name: FieldName) {
		const error = errors[name];
		return error ? (
			<p id={`car-${name}-error`} className="mt-1.5 text-[13px] leading-tight text-danger">
				{error}
			</p>
		) : null;
	}

	function field(
		name: FieldName,
		props: { inputMode?: "numeric"; placeholder?: string; type?: string; prefix?: string; suffix?: string; className?: string },
	) {
		const error = errors[name];
		const display = GROUPED_FIELDS.includes(name) && values[name] !== "" ? integerFormat.format(Number(values[name])) : values[name];
		return (
			<div className={props.className}>
				<Label htmlFor={`car-${name}`}>{LABELS[name]}</Label>
				<div className="relative">
					{props.prefix ? (
						<span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-subtle">
							{props.prefix}
						</span>
					) : null}
					<Input
						ref={(el) => {
							refs.current[name] = el;
						}}
						id={`car-${name}`}
						name={name}
						type={props.type ?? "text"}
						autoComplete="off"
						spellCheck={false}
						value={display}
						onChange={(e) => setField(name, e.target.value)}
						aria-invalid={error ? true : undefined}
						aria-describedby={error ? `car-${name}-error` : undefined}
						className={cn(
							NUMERIC_FIELDS.includes(name) && "num",
							props.prefix && "pl-11",
							props.suffix && "pr-11",
						)}
						{...(props.inputMode ? { inputMode: props.inputMode } : {})}
						{...(props.placeholder ? { placeholder: props.placeholder } : {})}
					/>
					{props.suffix ? (
						<span aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-subtle">
							{props.suffix}
						</span>
					) : null}
				</div>
				{errorText(name)}
			</div>
		);
	}

	function choice(name: "fuel" | "transmission", options: string[]) {
		const error = errors[name];
		const labelId = `car-${name}-label`;
		return (
			<div className="sm:col-span-2">
				<span id={labelId} className="mb-1.5 block text-[13px] font-medium text-ink-subtle">
					{LABELS[name]}
				</span>
				<ToggleGroup
					type="single"
					ref={(el: HTMLDivElement | null) => {
						refs.current[name] = el;
					}}
					id={`car-${name}`}
					aria-labelledby={labelId}
					aria-describedby={error ? `car-${name}-error` : undefined}
					value={values[name]}
					onValueChange={(v) => setField(name, v)}
					className={cn("flex-wrap", error && "border-danger")}
				>
					{options.map((option) => (
						<ToggleGroupItem key={option} value={option}>
							{option}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
				{errorText(name)}
			</div>
		);
	}

	return (
		<div className="pb-24">
			<nav aria-label="Trilha" className="flex items-center gap-1.5 text-sm text-ink-subtle">
				<Link
					to="/cars"
					className="-ml-2 inline-flex h-9 items-center gap-1.5 rounded-md px-2 hover:bg-muted hover:text-ink pointer-coarse:h-11"
				>
					<ArrowLeft aria-hidden="true" className="size-4" />
					Catálogo
				</Link>
				<ChevronRight aria-hidden="true" className="size-3.5 shrink-0" />
				<span className="text-ink" aria-current="page">
					Novo veículo
				</span>
			</nav>
			<h1 className="mt-3 text-[24px] font-semibold leading-tight tracking-[-0.02em] md:text-[30px]">Novo veículo</h1>
			<p className="mt-1 text-sm text-ink-subtle">Os campos marcados como opcionais podem ficar em branco.</p>

			<form className="mt-8" onSubmit={submit} noValidate aria-label="Cadastro de veículo">
				{formError ? (
					<p
						role="alert"
						className="mb-6 flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger"
					>
						<CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
						{formError}
					</p>
				) : null}
				{invalid.length > 0 ? (
					<div role="alert" className="mb-6 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger">
						<p className="font-medium">Corrija os campos abaixo para continuar:</p>
						<ul className="mt-1 list-disc pl-5">
							{invalid.map((name) => (
								<li key={name}>
									{LABELS[name].replace(" (opcional)", "")}: {errors[name]}
								</li>
							))}
						</ul>
					</div>
				) : null}
				<div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
					<div className="space-y-6">
						<Panel title="Identificação">
							{field("brand", { placeholder: "Ex.: Toyota…" })}
							{field("model", { placeholder: "Ex.: Corolla…" })}
							{field("version", { placeholder: "Ex.: XEi…", className: "sm:col-span-2" })}
						</Panel>
						<Panel title="Especificações">
							{field("year", { inputMode: "numeric", placeholder: "Ex.: 2022…" })}
							{field("mileage", { inputMode: "numeric", placeholder: "Ex.: 45.000…", suffix: "km" })}
							{choice("fuel", FUEL_OPTIONS)}
							{choice("transmission", TRANSMISSION_OPTIONS)}
						</Panel>
						<Panel title="Preço e foto">
							{field("price", { inputMode: "numeric", placeholder: "Ex.: 50.000…", prefix: "R$" })}
							{field("imageUrl", { type: "url", placeholder: "https://…", className: "sm:col-span-2" })}
						</Panel>
					</div>
					<aside className="lg:sticky lg:top-20">
						<h2 className="mb-3 text-sm font-medium text-ink-subtle">Como vai aparecer no catálogo</h2>
						{/* Pré-visualização decorativa: o mesmo card do catálogo, sem link. */}
						<ul aria-hidden="true" className="m-0 max-w-[300px] list-none p-0">
							<CarCard car={previewCar(values, previewUrl)} catalogSearch="" eager preview />
						</ul>
					</aside>
				</div>

				<div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/90 backdrop-blur">
					<div className="mx-auto flex h-[68px] max-w-[1200px] items-center justify-end gap-2 px-4 lg:px-6">
						<Link to="/cars" className={buttonVariants({ variant: "ghost" })}>
							Cancelar
						</Link>
						<Button type="submit" className="px-5" disabled={submitting} aria-busy={submitting}>
							<Check aria-hidden="true" />
							{submitting ? "Salvando…" : "Cadastrar veículo"}
						</Button>
					</div>
				</div>
			</form>
		</div>
	);
}

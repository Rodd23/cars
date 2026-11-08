import { ArrowLeft, CarFront, CircleAlert, Eye, EyeOff } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useSearchParams } from "react-router";
import { ApiError } from "../../api/client.js";
import { APP_NAME, useDocumentTitle } from "../../app/documentTitle.js";
import { Loading } from "../../components/States.js";
import { Button } from "../../components/ui/button.js";
import { Input } from "../../components/ui/input.js";
import { Label } from "../../components/ui/label.js";
import { useAuth } from "./AuthProvider.js";
import { sanitizeNext } from "./safeNext.js";

function errorMessage(error: unknown): string {
	if (error instanceof ApiError) {
		if (error.kind === "unauthorized") return "E-mail ou senha incorretos";
		if (error.kind === "rate_limited") return "Muitas tentativas. Tente novamente em alguns minutos.";
		if (error.kind === "network") return "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";
		if (error.kind === "validation") return "Confira o e-mail e a senha informados.";
	}
	return "Não foi possível entrar agora. Tente novamente.";
}

export function LoginPage() {
	useDocumentTitle("Entrar");
	const { state, login } = useAuth();
	const [params] = useSearchParams();
	const next = sanitizeNext(params.get("next"));
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const emailRef = useRef<HTMLInputElement>(null);
	const passwordRef = useRef<HTMLInputElement>(null);
	const busy = useRef(false);

	if (state.status === "loading") {
		return (
			<div className="mx-auto max-w-[380px] px-4 py-12">
				<Loading label="Verificando sessão…" />
			</div>
		);
	}
	if (state.status === "user") return <Navigate to={next} replace />;

	async function submit(e: FormEvent) {
		e.preventDefault();
		if (busy.current) return;
		if (email.trim() === "" || password === "") {
			const missingEmail = email.trim() === "";
			setError(missingEmail ? "Informe o e-mail." : "Informe a senha.");
			(missingEmail ? emailRef : passwordRef).current?.focus();
			return;
		}
		busy.current = true;
		setSubmitting(true);
		setError(null);
		try {
			await login(email.trim(), password);
		} catch (err) {
			setError(errorMessage(err));
			setSubmitting(false);
			busy.current = false;
			if (err instanceof ApiError && err.kind === "unauthorized") {
				// Aguarda a remoção do atributo disabled antes de focar.
				setTimeout(() => passwordRef.current?.focus(), 0);
			}
		}
	}

	return (
		<div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
			<div className="relative hidden overflow-hidden bg-[#0f1011] lg:block">
				<img
					src="/login-cover.jpg"
					alt=""
					width={1600}
					height={1067}
					loading="lazy"
					decoding="async"
					className="absolute inset-0 size-full object-cover opacity-85"
				/>
				<div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
				{/* Escurece o topo para a marca em branco manter contraste sobre céu claro. */}
				<div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/80 via-black/45 to-transparent" />
				<div className="absolute left-10 top-8 flex items-center gap-2.5 font-semibold text-white">
					<span aria-hidden="true" className="grid size-8 place-items-center rounded-lg bg-white text-[#0f1011]">
						<CarFront className="size-[18px]" />
					</span>
					{APP_NAME}
				</div>
				<div className="absolute inset-x-10 bottom-10 text-white">
					<p className="max-w-md text-[32px] font-semibold leading-tight tracking-[-0.02em]">Todo o estoque em um só lugar.</p>
					<p className="mt-2 max-w-md text-[15px] text-white/75">Consulte, filtre e cadastre veículos com a equipe.</p>
				</div>
			</div>

			<div className="flex items-center justify-center px-4 py-12">
				<div className="w-full max-w-[380px]">
					<div className="mb-10 flex items-center gap-2.5 font-semibold lg:hidden">
						<span aria-hidden="true" className="grid size-8 place-items-center rounded-lg bg-ink text-canvas">
							<CarFront className="size-[18px]" />
						</span>
						{APP_NAME}
					</div>
					<h1 className="text-[28px] font-semibold tracking-[-0.02em]">Entrar</h1>
					<p className="mt-1.5 text-sm text-ink-subtle">Use o e-mail e a senha fornecidos pelo administrador.</p>

					<form className="mt-8 space-y-4" onSubmit={submit} noValidate aria-label="Entrar">
						{error ? (
							<p
								role="alert"
								className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger"
							>
								<CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
								{error}
							</p>
						) : null}
						<div>
							<Label htmlFor="login-email">E-mail</Label>
							<Input
								ref={emailRef}
								id="login-email"
								name="email"
								type="email"
								autoComplete="username"
								spellCheck={false}
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>
						</div>
						<div>
							<Label htmlFor="login-password">Senha</Label>
							<div className="relative">
								<Input
									ref={passwordRef}
									id="login-password"
									name="password"
									type={showPassword ? "text" : "password"}
									autoComplete="current-password"
									className="pr-11"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
								/>
								<button
									type="button"
									aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
									className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-ink-subtle hover:bg-muted hover:text-ink pointer-coarse:size-10"
									onClick={() => setShowPassword((v) => !v)}
								>
									{showPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
								</button>
							</div>
						</div>
						<Button type="submit" className="mt-2 h-11 w-full" disabled={submitting} aria-busy={submitting}>
							{submitting ? "Entrando…" : "Entrar"}
						</Button>
					</form>
					<Link
						to="/cars"
						className="mt-6 inline-flex items-center gap-1.5 text-sm text-link underline-offset-4 hover:underline"
					>
						<ArrowLeft aria-hidden="true" className="size-4" />
						Voltar ao catálogo
					</Link>
				</div>
			</div>
		</div>
	);
}

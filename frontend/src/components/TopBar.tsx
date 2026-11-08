import { CarFront, ChevronDown, LogOut, Monitor, Moon, Palette, Plus, Sun, type LucideIcon } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { APP_NAME } from "../app/documentTitle.js";
import { useAuth } from "../features/auth/AuthProvider.js";
import { useThemePreference, type ThemePreference } from "../app/theme.js";
import { cn } from "../lib/cn.js";
import { Button, buttonVariants } from "./ui/button.js";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu.js";

const OPTIONS: { value: ThemePreference; label: string; Icon: LucideIcon }[] = [
	{ value: "system", label: "Sistema", Icon: Monitor },
	{ value: "light", label: "Claro", Icon: Sun },
	{ value: "dark", label: "Escuro", Icon: Moon },
];

/** Duas primeiras iniciais do nome (primeira e última palavra). */
function initials(name: string): string {
	const words = name.trim().split(/\s+/).filter(Boolean);
	const first = words[0]?.charAt(0) ?? "";
	const last = words.length > 1 ? (words[words.length - 1]?.charAt(0) ?? "") : "";
	return (first + last).toUpperCase();
}

function ThemeSelector({
	preference,
	onChange,
}: {
	preference: ThemePreference;
	onChange: (preference: ThemePreference) => void;
}) {
	return (
		<>
			<p className="px-2.5 pt-1.5 pb-1 text-xs text-ink-subtle">Tema</p>
			<div
				role="group"
				aria-label="Tema"
				className="mb-1 flex w-full gap-1 rounded-lg border border-line bg-muted p-1"
			>
				{OPTIONS.map(({ value, label, Icon }) => (
					// Item do menu (navegação por setas) com papel de botão; selecionar não fecha o menu.
					<DropdownMenuItem key={value} asChild onSelect={(e) => e.preventDefault()}>
						<button
							type="button"
							role="button"
							aria-pressed={preference === value}
							onClick={() => onChange(value)}
							className={cn(
								"flex h-8 w-auto min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-1 text-[13px] font-medium text-ink-subtle hover:text-ink data-[highlighted]:text-ink",
								"pointer-coarse:h-11",
								"aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-[0_1px_2px_rgb(0_0_0/0.12)]",
							)}
						>
							<Icon aria-hidden="true" className="size-3.5" />
							{label}
						</button>
					</DropdownMenuItem>
				))}
			</div>
		</>
	);
}

export function TopBar() {
	const [preference, setPreference] = useThemePreference();
	const { state, logout } = useAuth();
	const navigate = useNavigate();

	async function signOut() {
		// Sai antes de limpar a sessão para que RequireAuth não redirecione ao login.
		navigate("/cars");
		await logout();
	}
	return (
		<header className="border-b border-line bg-surface/80 backdrop-blur-sm">
			<div className="mx-auto flex h-16 max-w-[1200px] items-center gap-4 px-4 lg:px-6">
				<Link
					to="/cars"
					aria-label={APP_NAME}
					className="flex items-center gap-2.5 rounded-md text-[15px] font-semibold tracking-tight text-ink"
				>
					<span aria-hidden="true" className="grid size-8 place-items-center rounded-lg bg-ink text-canvas">
						<CarFront className="size-[18px]" />
					</span>
					{/* Em telas estreitas mostra só "Catálogo" para caber com as ações. */}
					<span aria-hidden="true">
						Catálogo<span className="hidden font-medium text-ink-subtle sm:inline"> de veículos</span>
					</span>
				</Link>
				<div className="ml-auto flex items-center gap-1.5">
					{state.status === "user" ? (
						<Link
							to="/cars/new"
							aria-label="Novo veículo"
							className={cn(buttonVariants(), "px-0 size-10 pointer-coarse:size-11 sm:w-auto sm:px-4")}
						>
							<Plus aria-hidden="true" />
							<span className="hidden sm:inline">Novo veículo</span>
						</Link>
					) : null}
					{/* Enquanto a sessão carrega, não mostra "Entrar" nem o nome. */}
					{state.status === "anon" ? (
						<>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="icon" aria-label="Tema">
										<Palette aria-hidden="true" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent className="w-72">
									<ThemeSelector preference={preference} onChange={setPreference} />
								</DropdownMenuContent>
							</DropdownMenu>
							<Link to="/login" className={buttonVariants({ variant: "outline" })}>
								Entrar
							</Link>
						</>
					) : null}
					{state.status === "user" ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" aria-label={`Menu de ${state.user.name}`} className="gap-2 pl-1.5 pr-2.5">
									<span
										aria-hidden="true"
										className="grid size-7 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary-soft-ink"
									>
										{initials(state.user.name)}
									</span>
									<span className="hidden max-w-32 truncate text-ink md:inline" title={state.user.name}>
										{state.user.name.trim().split(/\s+/)[0] ?? state.user.name}
									</span>
									<ChevronDown aria-hidden="true" className="text-ink-subtle" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent className="w-72">
								<DropdownMenuLabel>
									<span className="block break-words text-sm font-medium text-ink">{state.user.name}</span>
									<span className="block break-all text-xs font-normal text-ink-subtle">{state.user.email}</span>
								</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<ThemeSelector preference={preference} onChange={setPreference} />
								<DropdownMenuSeparator />
								<DropdownMenuItem onSelect={() => void signOut()}>
									<LogOut aria-hidden="true" />
									Sair
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					) : null}
				</div>
			</div>
		</header>
	);
}

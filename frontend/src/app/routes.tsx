import { Link, Navigate, Outlet, ScrollRestoration, type RouteObject } from "react-router";
import { Message } from "../components/States.js";
import { buttonVariants } from "../components/ui/button.js";
import { TopBar } from "../components/TopBar.js";
import { CarDetailsPage } from "../features/catalog/CarDetailsPage.js";
import { CatalogPage } from "../features/catalog/CatalogPage.js";
import { CarFormPage } from "../features/admin/CarFormPage.js";
import { AuthProvider } from "../features/auth/AuthProvider.js";
import { LoginPage } from "../features/auth/LoginPage.js";
import { RequireAuth } from "../features/auth/RequireAuth.js";
import { useDocumentTitle } from "./documentTitle.js";

export const MAIN_ID = "conteudo";

function AppLayout() {
	return (
		<AuthProvider>
			<a
				className="absolute left-4 top-2 z-50 -translate-y-[200%] rounded-lg border border-input bg-surface px-4 py-2 text-link focus-visible:translate-y-0"
				href={`#${MAIN_ID}`}
			>
				Pular para o conteúdo
			</a>
			<Outlet />
			{/* Posição de rolagem por URL: voltar dos detalhes restaura a lista na mesma busca e página. */}
			<ScrollRestoration getKey={(location) => location.pathname + location.search} />
		</AuthProvider>
	);
}

/** Páginas com a barra superior. */
function WithTopBar() {
	return (
		<>
			<TopBar />
			<main id={MAIN_ID} tabIndex={-1} className="mx-auto max-w-[1200px] px-4 pb-16 pt-8 lg:px-6">
				<Outlet />
			</main>
		</>
	);
}

/** Login: tela própria, sem a barra superior. */
function Bare() {
	return (
		<main id={MAIN_ID} tabIndex={-1}>
			<Outlet />
		</main>
	);
}

function NotFoundPage() {
	useDocumentTitle("Página não encontrada");
	return (
		<>
			<h1 className="mb-4 text-[24px] font-semibold leading-tight tracking-[-0.02em] md:text-[30px]">Página não encontrada</h1>
			<Message
				title="Este endereço não existe"
				action={
					<Link to="/cars" className={buttonVariants()}>
						Ir para o catálogo
					</Link>
				}
			>
				Confira o endereço ou volte para a lista de veículos.
			</Message>
		</>
	);
}

export const routes: RouteObject[] = [
	{
		element: <AppLayout />,
		children: [
			{ element: <Bare />, children: [{ path: "/login", element: <LoginPage /> }] },
			{
				element: <WithTopBar />,
				children: [
					{ path: "/", element: <Navigate to="/cars" replace /> },
					{ path: "/cars", element: <CatalogPage /> },
					{
						path: "/cars/new",
						element: (
							<RequireAuth>
								<CarFormPage />
							</RequireAuth>
						),
					},
					{ path: "/cars/:id", element: <CarDetailsPage /> },
					{ path: "*", element: <NotFoundPage /> },
				],
			},
		],
	},
];

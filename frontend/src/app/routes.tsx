import { Link, Navigate, type RouteObject } from "react-router";
import { CarDetailsPage } from "../features/catalog/CarDetailsPage.js";
import { CatalogPage } from "../features/catalog/CatalogPage.js";

function NotFoundPage() {
	return (
		<main className="container">
			<h1>Página não encontrada</h1>
			<p>
				<Link to="/cars">Ir para o catálogo</Link>
			</p>
		</main>
	);
}

export const routes: RouteObject[] = [
	{ path: "/", element: <Navigate to="/cars" replace /> },
	{ path: "/cars", element: <CatalogPage /> },
	{ path: "/cars/:id", element: <CarDetailsPage /> },
	{ path: "*", element: <NotFoundPage /> },
];

import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { Loading } from "../../components/States.js";
import { useAuth } from "./AuthProvider.js";
import { loginPath } from "./safeNext.js";

export function RequireAuth({ children }: { children: ReactNode }) {
	const { state } = useAuth();
	const location = useLocation();
	if (state.status === "loading") return <Loading label="Verificando sessão…" />;
	if (state.status === "anon") {
		return <Navigate to={loginPath(location.pathname + location.search)} replace />;
	}
	return <>{children}</>;
}

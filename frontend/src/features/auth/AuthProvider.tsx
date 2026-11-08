import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getMe, login as apiLogin, logout as apiLogout } from "../../api/client.js";
import type { AuthUser } from "../../api/types.js";

export type AuthState = { status: "loading" } | { status: "anon" } | { status: "user"; user: AuthUser };

type AuthContextValue = {
	state: AuthState;
	login: (email: string, password: string) => Promise<void>;
	logout: () => Promise<void>;
	/** Marca a sessão como encerrada (ex.: 401 em uma chamada protegida). */
	expire: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [state, setState] = useState<AuthState>({ status: "loading" });

	useEffect(() => {
		const controller = new AbortController();
		getMe(controller.signal)
			.then((user) => {
				if (!controller.signal.aborted) setState(user ? { status: "user", user } : { status: "anon" });
			})
			.catch(() => {
				// Falha de rede ou erro do servidor: trata como sem sessão; o login mostra o erro se persistir.
				if (!controller.signal.aborted) setState({ status: "anon" });
			});
		return () => controller.abort();
	}, []);

	const login = useCallback(async (email: string, password: string) => {
		const user = await apiLogin(email, password);
		setState({ status: "user", user });
	}, []);

	const logout = useCallback(async () => {
		try {
			await apiLogout();
		} catch {
			// O estado local é limpo mesmo se a chamada falhar.
		}
		setState({ status: "anon" });
	}, []);

	const expire = useCallback(() => setState({ status: "anon" }), []);

	const value = useMemo(() => ({ state, login, logout, expire }), [state, login, logout, expire]);
	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
	const value = useContext(AuthContext);
	if (!value) throw new Error("useAuth deve ser usado dentro de AuthProvider");
	return value;
}

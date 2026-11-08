import { useSyncExternalStore } from "react";

/** Resultado de uma media query; sem matchMedia (ex.: testes), devolve o valor de fallback. */
export function useMediaQuery(query: string, fallback = true): boolean {
	return useSyncExternalStore(
		(onChange) => {
			const list = window.matchMedia?.(query);
			list?.addEventListener("change", onChange);
			return () => list?.removeEventListener("change", onChange);
		},
		() => window.matchMedia?.(query).matches ?? fallback,
		() => fallback,
	);
}

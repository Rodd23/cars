import { useCallback, useState } from "react";

export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "catalog-theme";

const CANVAS: Record<"light" | "dark", string> = { light: "#f7f8f8", dark: "#010102" };

export function readThemePreference(): ThemePreference {
	try {
		const value = window.localStorage.getItem(THEME_STORAGE_KEY);
		return value === "light" || value === "dark" ? value : "system";
	} catch {
		return "system";
	}
}

function storeThemePreference(preference: ThemePreference): void {
	try {
		if (preference === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
		else window.localStorage.setItem(THEME_STORAGE_KEY, preference);
	} catch {
		// Sem armazenamento disponível: a escolha vale só para esta sessão.
	}
}

/** Aplica a preferência em <html> e alinha as metas theme-color. */
export function applyThemePreference(preference: ThemePreference): void {
	const root = document.documentElement;
	if (preference === "system") delete root.dataset.theme;
	else root.dataset.theme = preference;

	for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
		const scheme = meta.media.includes("dark") ? "dark" : "light";
		meta.content = CANVAS[preference === "system" ? scheme : preference];
	}
}

export function useThemePreference(): [ThemePreference, (preference: ThemePreference) => void] {
	const [preference, setPreference] = useState<ThemePreference>(readThemePreference);
	const update = useCallback((next: ThemePreference) => {
		storeThemePreference(next);
		applyThemePreference(next);
		setPreference(next);
	}, []);
	return [preference, update];
}

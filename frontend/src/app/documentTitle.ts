import { useEffect } from "react";

export const APP_NAME = "Catálogo de veículos";

export function formatDocumentTitle(title?: string): string {
	return title ? `${title} · ${APP_NAME}` : APP_NAME;
}

/** Define o título da aba; sem argumento, usa apenas o nome do catálogo. */
export function useDocumentTitle(title?: string): void {
	useEffect(() => {
		document.title = formatDocumentTitle(title);
	}, [title]);
}

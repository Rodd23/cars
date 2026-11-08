export const DEFAULT_NEXT = "/cars";

/** Aceita só caminhos internos ("/..."); qualquer outro valor vira o catálogo. */
export function sanitizeNext(raw: string | null | undefined): string {
	if (typeof raw !== "string" || !raw.startsWith("/")) return DEFAULT_NEXT;
	if (raw.includes("//") || raw.includes("\\")) return DEFAULT_NEXT;
	for (const char of raw) {
		const code = char.charCodeAt(0);
		if (code < 0x20 || code === 0x7f) return DEFAULT_NEXT;
	}
	return raw;
}

/** Monta "/login?next=<caminho>" mantendo as barras legíveis. */
export function loginPath(next: string): string {
	return `/login?next=${encodeURIComponent(next).replace(/%2F/gi, "/")}`;
}

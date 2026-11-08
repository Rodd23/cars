import type { FastifyCorsOptions } from "@fastify/cors";
import { z } from "zod";

export const DEFAULT_DEVELOPMENT_CORS_ORIGINS = ["http://localhost:5173"];

const originSchema = z
	.url({ protocol: /^https?$/ })
	.refine((value) => URL.canParse(value) && new URL(value).origin === value, {
		message:
			"Use apenas a origem (protocolo, host e porta), sem caminho ou barra final",
	});

// Comma-separated list, e.g. "http://localhost:5173,https://catalogo.exemplo.com".
export const corsOriginsSchema = z
	.string()
	.transform((value) =>
		value
			.split(",")
			.map((origin) => origin.trim())
			.filter(Boolean),
	)
	.pipe(z.array(originSchema));

export function buildCorsOptions(origins: string[]): FastifyCorsOptions {
	return { origin: [...origins], credentials: true };
}

import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthService, AuthUser } from "./auth.service.js";

export const SESSION_COOKIE = "sid";

declare module "fastify" {
	interface FastifyRequest {
		user?: AuthUser;
	}
}

// Requires @fastify/cookie to be registered on the root instance.
export function createAuthGuard(options: {
	service: AuthService;
	allowedOrigins: string[];
}) {
	const { service, allowedOrigins } = options;

	// Rejects a present Origin that is not in CORS_ORIGINS; no Origin (curl) passes.
	async function requireAllowedOrigin(
		request: FastifyRequest,
		reply: FastifyReply,
	) {
		const origin = request.headers.origin;
		if (origin !== undefined && !allowedOrigins.includes(origin)) {
			return reply.status(403).send({ error: "Forbidden" });
		}
	}

	async function requireSession(request: FastifyRequest, reply: FastifyReply) {
		const token = request.cookies[SESSION_COOKIE];
		const user =
			token && token.length <= 256 ? await service.authenticate(token) : null;
		if (!user) {
			return reply.status(401).send({ error: "Unauthorized" });
		}
		request.user = user;
	}

	return { requireAllowedOrigin, requireSession };
}

export type AuthGuard = ReturnType<typeof createAuthGuard>;

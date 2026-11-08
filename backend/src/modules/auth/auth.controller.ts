import type { FastifyReply, FastifyRequest } from "fastify";
import { formatIssues } from "../shared/validation.js";
import { loginSchema } from "./auth.schema.js";
import { SESSION_COOKIE } from "./auth.guard.js";
import type { AuthService } from "./auth.service.js";

export class AuthController {
	constructor(
		private readonly service: AuthService,
		private readonly secureCookie: boolean,
	) {}

	private cookieOptions() {
		return {
			httpOnly: true,
			sameSite: "lax" as const,
			path: "/",
			secure: this.secureCookie,
		};
	}

	async login(request: FastifyRequest, reply: FastifyReply) {
		const parsed = loginSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "Validation error",
				details: formatIssues(parsed.error),
			});
		}
		const result = await this.service.login(
			parsed.data.email,
			parsed.data.password,
		);
		if (!result) {
			return reply.status(401).send({ error: "Invalid credentials" });
		}
		reply.setCookie(SESSION_COOKIE, result.token, {
			...this.cookieOptions(),
			maxAge: this.service.ttlSeconds,
		});
		return reply.status(200).send({ user: result.user });
	}

	async logout(request: FastifyRequest, reply: FastifyReply) {
		const token = request.cookies[SESSION_COOKIE];
		if (token && token.length <= 256) {
			await this.service.logout(token);
		}
		reply.clearCookie(SESSION_COOKIE, this.cookieOptions());
		return reply.status(204).send();
	}

	async me(request: FastifyRequest, reply: FastifyReply) {
		return reply.status(200).send({ user: request.user });
	}
}

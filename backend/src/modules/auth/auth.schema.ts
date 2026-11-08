import { z } from "zod";

export const emailSchema = z
	.string()
	.trim()
	.toLowerCase()
	.max(254, "Email must have at most 254 characters")
	.pipe(z.email("Email must be valid"));

export const loginSchema = z.object({
	email: emailSchema,
	password: z
		.string()
		.min(1, "Password is required")
		.max(1024, "Password must have at most 1024 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

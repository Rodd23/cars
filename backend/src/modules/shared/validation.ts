import type { ZodError } from "zod";

export function formatIssues(error: ZodError) {
	return error.issues.map((issue) => ({
		path: issue.path.join("."),
		message: issue.message,
	}));
}

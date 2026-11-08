import type { FastifyReply, FastifyRequest } from "fastify";
import { formatIssues } from "../shared/validation.js";
import { createCarSchema, type CreateCarInput } from "./cars.schema.js";

export interface CarCreator {
	createCar(data: CreateCarInput): Promise<unknown[]>;
}

export class CreateCarController {
	constructor(private readonly creator: CarCreator) {}

	async createCar(request: FastifyRequest, reply: FastifyReply) {
		const parsed = createCarSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "Validation error",
				details: formatIssues(parsed.error),
			});
		}
		try {
			const [car] = await this.creator.createCar(parsed.data);
			return reply.status(201).send(car);
		} catch (error) {
			// The internal message stays in the log and out of the response.
			request.log.error({ err: error }, "Failed to create car");
			return reply.status(500).send({ error: "Failed to create car" });
		}
	}
}

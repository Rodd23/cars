import z from "zod";

const text = (label: string, max: number) =>
    z.string().trim()
        .min(1, `${label} is required`)
        .max(max, `${label} must have at most ${max} characters`);

export const createCarSchema = z.object({
    brand: text("Brand", 80),
    model: text("Model", 120),
    version: text("Version", 120).optional(),
    year: z.number().int("Year must be an integer")
        .min(1886, "Year must be greater than or equal to 1886")
        // Evaluated per request, so the limit follows the current year.
        .refine((year) => year <= new Date().getFullYear() + 1, {
            message: "Year must not be after next year",
        }),
    price: z.number().int("Price must be an integer").positive("Price must be a positive number")
        .max(9_999_999_999, "Price must be at most 9999999999"),
    fuel: text("Fuel", 30),
    transmission: text("Transmission", 30),
    mileage: z.number().int("Mileage must be an integer")
        .min(0, "Mileage must be at least 0")
        .max(2_000_000, "Mileage must be at most 2000000"),
    imageUrl: z.string().trim()
        .max(2048, "Image URL must have at most 2048 characters")
        .pipe(z.url({ protocol: /^https?$/, message: "Image URL must be a valid http or https URL" }))
        .optional(),
});

export type CreateCarInput = z.infer<typeof createCarSchema>;
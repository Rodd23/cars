import { formatMileage, formatOptional, formatPrice } from "../src/features/catalog/format.js";

const norm = (s: string) => s.replace(/ /g, " ");

describe("format", () => {
	it("formata preco em reais", () => {
		expect(norm(formatPrice("50000.00"))).toBe("R$ 50.000,00");
		expect(norm(formatPrice("1234.56"))).toBe("R$ 1.234,56");
	});

	it("formata quilometragem", () => {
		expect(formatMileage(0)).toBe("0 km");
		expect(formatMileage(null)).toBe("Não informada");
		expect(formatMileage(45000)).toBe("45.000 km");
	});

	it("formata campos opcionais", () => {
		expect(formatOptional(null)).toBe("Não informado");
		expect(formatOptional("Flex")).toBe("Flex");
	});
});

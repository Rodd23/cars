import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { json, makeCar, makeList, mockFetch, renderApp } from "./helpers.js";

afterEach(() => {
	vi.unstubAllGlobals();
});

const ID = "11111111-1111-4111-8111-111111111111";

describe("detalhes", () => {
	it("mostra campos e usa Nao informado para nulos", async () => {
		mockFetch(() => json(makeCar({ version: null, fuel: null, transmission: null, mileage: null, imageUrl: null })));
		renderApp(`/cars/${ID}`);
		expect(await screen.findByRole("heading", { level: 1, name: "Toyota Corolla" })).toBeInTheDocument();
		// Ficha 2 x 2: combustível e câmbio sem valor; a versão nula não gera linha nem badge vazio.
		expect(screen.getAllByText("Não informado")).toHaveLength(2);
		expect(screen.getByText("Não informada")).toBeInTheDocument();
		expect(screen.getByText("Sem imagem")).toBeInTheDocument();
		expect(screen.queryByText(/null/)).not.toBeInTheDocument();
		expect(screen.queryByText("XEi")).not.toBeInTheDocument();
		const dl = document.querySelector("dl")!;
		expect([...dl.querySelectorAll("dt")].map((dt) => dt.textContent)).toEqual(["Ano", "Quilometragem", "Combustível", "Câmbio"]);
	});

	it("mostra versao, preco com centavos, badges e datas de cadastro e atualizacao", async () => {
		mockFetch(() =>
			json(makeCar({ createdAt: "2024-03-15T12:00:00.000Z", updatedAt: "2024-05-20T12:00:00.000Z" })),
		);
		renderApp(`/cars/${ID}`);
		await screen.findByRole("heading", { level: 1, name: "Toyota Corolla" });
		expect(screen.getByText("XEi")).toBeInTheDocument();
		expect(screen.getByText(/R\$\s50\.000,00/)).toBeInTheDocument();
		expect(screen.getByText("45.000 km")).toBeInTheDocument();
		expect(screen.getAllByText("Flex")).toHaveLength(2);
		expect(screen.getByText("Cadastrado em 15/03/2024 · atualizado em 20/05/2024")).toBeInTheDocument();
		const trail = screen.getByRole("navigation", { name: "Trilha" });
		expect(trail).toHaveTextContent("Catálogo");
		expect(trail).toHaveTextContent("Toyota Corolla");
	});

	it("404 mostra veiculo nao encontrado", async () => {
		mockFetch(() => json({ error: { code: "CAR_NOT_FOUND", message: "x" } }, 404));
		renderApp(`/cars/${ID}`);
		expect(await screen.findByText("Veículo não encontrado")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Voltar ao catálogo" })).toHaveAttribute("href", "/cars");
		expect(screen.queryByRole("navigation", { name: "Trilha" })).not.toBeInTheDocument();
	});

	it("500 permite tentar novamente", async () => {
		const user = userEvent.setup();
		let calls = 0;
		mockFetch(() => (++calls === 1 ? json({ error: { code: "INTERNAL_ERROR", message: "x" } }, 500) : json(makeCar())));
		renderApp(`/cars/${ID}`);
		await user.click(await screen.findByRole("button", { name: "Tentar novamente" }));
		expect(await screen.findByRole("heading", { level: 1, name: "Toyota Corolla" })).toBeInTheDocument();
	});

	it("trilha Catalogo restaura filtros e pagina; fluxo so usa GET", async () => {
		const user = userEvent.setup();
		const fetchMock = mockFetch((url) =>
			url.pathname === "/cars" ? json(makeList([makeCar()], 2, 30)) : json(makeCar()),
		);
		const { router } = renderApp("/cars?brand=Toyota&page=2");
		await user.click(await screen.findByRole("link", { name: "Toyota Corolla" }));
		expect(await screen.findByRole("heading", { level: 1, name: "Toyota Corolla" })).toBeInTheDocument();
		expect(router.state.location.pathname).toBe(`/cars/${ID}`);

		await user.click(within(screen.getByRole("navigation", { name: "Trilha" })).getByRole("link", { name: "Catálogo" }));
		await waitFor(() => expect(router.state.location.pathname).toBe("/cars"));
		expect(router.state.location.search).toBe("?brand=Toyota&page=2");
		expect(await screen.findByLabelText("Marca")).toHaveValue("Toyota");
		await screen.findByText(/Página 2 de 3/);

		expect(fetchMock.mock.calls.length).toBeGreaterThan(2);
		for (const call of fetchMock.mock.calls) {
			expect(call[1]?.method).toBe("GET");
		}
	});
});

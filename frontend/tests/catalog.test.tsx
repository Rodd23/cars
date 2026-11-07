import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { json, makeCar, makeList, mockFetch, renderApp, requestedUrls } from "./helpers.js";

afterEach(() => {
	vi.unstubAllGlobals();
});

const car2 = makeCar({ id: "22222222-2222-4222-8222-222222222222", brand: "Honda", model: "Civic", version: null, mileage: 0 });

describe("catalogo", () => {
	it("renderiza cards e envia query sem filtros vazios", async () => {
		const fetchMock = mockFetch(() => json(makeList([makeCar(), car2])));
		renderApp("/cars");
		expect(await screen.findByText("Toyota Corolla")).toBeInTheDocument();
		expect(screen.getByText("Honda Civic")).toBeInTheDocument();
		expect(screen.getByText(/· 0 km/)).toBeInTheDocument();
		expect(screen.queryByText("null")).not.toBeInTheDocument();
		const url = requestedUrls(fetchMock)[0]!;
		expect(url.pathname).toBe("/cars");
		expect(url.searchParams.get("page")).toBe("1");
		expect(url.searchParams.get("pageSize")).toBe("12");
		expect([...url.searchParams.keys()].sort()).toEqual(["page", "pageSize"]);
	});

	it("page invalido vira 1", async () => {
		const fetchMock = mockFetch(() => json(makeList([makeCar()])));
		renderApp("/cars?page=abc");
		await screen.findByText("Toyota Corolla");
		expect(requestedUrls(fetchMock)[0]!.searchParams.get("page")).toBe("1");
	});

	it("Buscar aplica trim e page 1; Limpar remove filtros; sem fetch por tecla", async () => {
		const user = userEvent.setup();
		const fetchMock = mockFetch(() => json(makeList([makeCar()], 1, 30)));
		const { router } = renderApp("/cars?page=2");
		await screen.findByText("Toyota Corolla");
		expect(fetchMock).toHaveBeenCalledTimes(1);

		await user.type(screen.getByLabelText("Marca"), "  Toy  ");
		await user.type(screen.getByLabelText("Modelo"), "Cor");
		expect(fetchMock).toHaveBeenCalledTimes(1);

		await user.click(screen.getByRole("button", { name: "Buscar" }));
		await screen.findByText("Toyota Corolla");
		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
		expect(router.state.location.search).toBe("?brand=Toy&model=Cor");
		const url = requestedUrls(fetchMock)[1]!;
		expect(url.searchParams.get("brand")).toBe("Toy");
		expect(url.searchParams.get("page")).toBe("1");
		expect(url.searchParams.has("version")).toBe(false);

		await user.click(screen.getByRole("button", { name: "Limpar" }));
		await screen.findByText("Toyota Corolla");
		expect(router.state.location.search).toBe("");
		expect(screen.getByLabelText("Marca")).toHaveValue("");
	});

	it("inputs refletem a URL ao navegar no historico", async () => {
		mockFetch(() => json(makeList([makeCar()])));
		const { router } = renderApp("/cars?brand=Fiat");
		await screen.findByText("Toyota Corolla");
		expect(screen.getByLabelText("Marca")).toHaveValue("Fiat");
		await act(() => router.navigate("/cars?brand=Ford"));
		expect(screen.getByLabelText("Marca")).toHaveValue("Ford");
	});

	it("paginacao atualiza URL e desabilita nos limites", async () => {
		const user = userEvent.setup();
		mockFetch((url) => json(makeList([makeCar()], Number(url.searchParams.get("page")), 30)));
		const { router } = renderApp("/cars");
		await screen.findByText(/Página 1 de 3/);
		expect(screen.getByText(/30 resultados/)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();

		await user.click(screen.getByRole("button", { name: "Próxima" }));
		await screen.findByText(/Página 2 de 3/);
		expect(router.state.location.search).toBe("?page=2");

		await user.click(screen.getByRole("button", { name: "Próxima" }));
		await screen.findByText(/Página 3 de 3/);
		expect(screen.getByRole("button", { name: "Próxima" })).toBeDisabled();

		await user.click(screen.getByRole("button", { name: "Anterior" }));
		await screen.findByText(/Página 2 de 3/);
	});

	it("diferencia tres estados vazios", async () => {
		const user = userEvent.setup();
		mockFetch((url) => {
			if (url.searchParams.get("page") === "9") return json(makeList([], 9, 30));
			return json(makeList([], 1, 0));
		});
		const { router } = renderApp("/cars");
		expect(await screen.findByText("Nenhum veículo cadastrado")).toBeInTheDocument();

		await act(() => router.navigate("/cars?brand=Zzz"));
		expect(await screen.findByText("Nenhum veículo encontrado")).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Limpar filtros" }));
		expect(await screen.findByText("Nenhum veículo cadastrado")).toBeInTheDocument();
		expect(router.state.location.search).toBe("");

		await act(() => router.navigate("/cars?brand=Toyota&page=9"));
		expect(await screen.findByText("Página fora do intervalo")).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Ir para a primeira página" }));
		await waitFor(() => expect(router.state.location.search).toBe("?brand=Toyota"));
	});

	it("erro permite tentar novamente", async () => {
		const user = userEvent.setup();
		let calls = 0;
		const fetchMock = mockFetch(() => {
			calls += 1;
			if (calls === 1) throw new TypeError("Failed to fetch");
			return json(makeList([makeCar()]));
		});
		renderApp("/cars");
		expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar");
		expect(screen.queryByText(/Failed to fetch/)).not.toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
		expect(await screen.findByText("Toyota Corolla")).toBeInTheDocument();
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(requestedUrls(fetchMock)[1]!.search).toBe(requestedUrls(fetchMock)[0]!.search);
	});

	it("mostra indicador de carregamento e desabilita Buscar", async () => {
		let resolve!: (r: Response) => void;
		mockFetch(() => new Promise<Response>((r) => (resolve = r)));
		renderApp("/cars");
		expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
		expect(screen.getByRole("button", { name: "Buscar" })).toBeDisabled();
		await act(async () => resolve(json(makeList([makeCar()]))));
		expect(await screen.findByText("Toyota Corolla")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Buscar" })).toBeEnabled();
	});

	it("resposta antiga nao sobrescreve a mais recente", async () => {
		const pending = new Map<string, (r: Response) => void>();
		mockFetch(
			(url) =>
				new Promise<Response>((r) => {
					pending.set(url.searchParams.get("brand") ?? "", r);
				}),
		);
		const { router } = renderApp("/cars?brand=A");
		await waitFor(() => expect(pending.has("A")).toBe(true));
		await act(() => router.navigate("/cars?brand=B"));
		await waitFor(() => expect(pending.has("B")).toBe(true));

		await act(async () => pending.get("B")!(json(makeList([makeCar({ brand: "Bmw", model: "X1" })]))));
		expect(await screen.findByText("Bmw X1")).toBeInTheDocument();
		await act(async () => pending.get("A")!(json(makeList([makeCar({ brand: "Audi", model: "A3" })]))));
		expect(screen.getByText("Bmw X1")).toBeInTheDocument();
		expect(screen.queryByText("Audi A3")).not.toBeInTheDocument();
	});

	it("imagem quebrada ou nula mostra fallback", async () => {
		mockFetch(() => json(makeList([makeCar(), car2.imageUrl === null ? car2 : { ...car2, imageUrl: null }])));
		renderApp("/cars");
		await screen.findByText("Toyota Corolla");
		expect(screen.getAllByText("Sem imagem")).toHaveLength(1);
		const img = screen.getByAltText("Foto do Toyota Corolla 2020");
		expect(img).toHaveAttribute("loading", "lazy");
		fireEvent.error(img);
		await waitFor(() => expect(screen.getAllByText("Sem imagem")).toHaveLength(2));
		expect(screen.getByRole("img", { name: "Foto do Toyota Corolla 2020" })).toBeInTheDocument();
	});

	it("rota desconhecida e redirecionamento de /", async () => {
		mockFetch(() => json(makeList([makeCar()])));
		const { router, unmount } = renderApp("/");
		await screen.findByText("Toyota Corolla");
		expect(router.state.location.pathname).toBe("/cars");
		unmount();
		renderApp("/nada");
		expect(screen.getByRole("heading", { name: "Página não encontrada" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Ir para o catálogo" })).toHaveAttribute("href", "/cars");
	});
});

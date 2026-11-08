import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readThemePreference, THEME_STORAGE_KEY } from "../src/app/theme.js";
import { json, makeCar, makeList, mockApi, mockFetch, renderApp, requestedUrls } from "./helpers.js";

/** Abre o seletor de tema: botão "Tema" (visitante) dentro do menu. */
async function openThemeMenu(user: ReturnType<typeof userEvent.setup>) {
	await user.click(screen.getByRole("button", { name: "Tema" }));
	return screen.findByRole("group", { name: "Tema" });
}

const ID = "11111111-1111-4111-8111-111111111111";

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	window.localStorage.clear();
	delete document.documentElement.dataset.theme;
});

describe("tema", () => {
	it("segue o sistema por padrão e persiste a escolha manual", async () => {
		const user = userEvent.setup();
		mockFetch(() => json(makeList([makeCar()])));
		renderApp("/cars");
		await screen.findByText("Toyota Corolla");
		// O seletor fica dentro do menu: não aparece até abrir.
		expect(screen.queryByRole("group", { name: "Tema" })).not.toBeInTheDocument();
		const tema = await openThemeMenu(user);
		expect(tema).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Sistema" })).toHaveAttribute("aria-pressed", "true");
		expect(document.documentElement.dataset.theme).toBeUndefined();

		await user.click(screen.getByRole("button", { name: "Escuro" }));
		expect(document.documentElement.dataset.theme).toBe("dark");
		expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
		expect(screen.getByRole("button", { name: "Escuro" })).toHaveAttribute("aria-pressed", "true");
		expect(readThemePreference()).toBe("dark");

		await user.click(screen.getByRole("button", { name: "Sistema" }));
		expect(document.documentElement.dataset.theme).toBeUndefined();
		expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
	});

	it("restaura a preferência gravada ao abrir", async () => {
		const user = userEvent.setup();
		window.localStorage.setItem(THEME_STORAGE_KEY, "light");
		mockFetch(() => json(makeList([makeCar()])));
		renderApp("/cars");
		await screen.findByText("Toyota Corolla");
		await openThemeMenu(user);
		expect(screen.getByRole("button", { name: "Claro" })).toHaveAttribute("aria-pressed", "true");
	});

	it("localStorage indisponível cai no tema do sistema sem erro", async () => {
		const user = userEvent.setup();
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("blocked");
		});
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new Error("blocked");
		});
		expect(readThemePreference()).toBe("system");
		mockFetch(() => json(makeList([makeCar()])));
		renderApp("/cars");
		await screen.findByText("Toyota Corolla");
		await openThemeMenu(user);
		await user.click(screen.getByRole("button", { name: "Escuro" }));
		expect(document.documentElement.dataset.theme).toBe("dark");
	});

	it("com sessão, o seletor de tema fica no menu do usuário", async () => {
		const user = userEvent.setup();
		mockApi((url) =>
			url.pathname === "/auth/me"
				? json({ user: { id: "u1", email: "ana@empresa.com", name: "Ana Souza" } })
				: json(makeList([makeCar()])),
		);
		renderApp("/cars");
		await screen.findByText("Toyota Corolla");
		await user.click(await screen.findByRole("button", { name: "Menu de Ana Souza" }));
		expect(screen.getByText("AS")).toBeInTheDocument();
		await user.click(await screen.findByRole("button", { name: "Escuro" }));
		expect(document.documentElement.dataset.theme).toBe("dark");
		expect(screen.getByRole("button", { name: "Escuro" })).toHaveAttribute("aria-pressed", "true");
	});
});

describe("titulo da aba e estrutura", () => {
	it("define document.title por pagina e um h1 por pagina", async () => {
		mockFetch((url) => (url.pathname === "/cars" ? json(makeList([makeCar()])) : json(makeCar())));
		const { router } = renderApp("/cars");
		await screen.findByText("Toyota Corolla");
		await waitFor(() => expect(document.title).toBe("Catálogo de veículos"));
		expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);

		await act(() => router.navigate(`/cars/${ID}`));
		await screen.findByRole("heading", { level: 1, name: "Toyota Corolla" });
		await waitFor(() => expect(document.title).toBe("Toyota Corolla 2020 · Catálogo de veículos"));
		expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);

		await act(() => router.navigate("/nada"));
		await waitFor(() => expect(document.title).toBe("Página não encontrada · Catálogo de veículos"));
	});

	it("tem link para pular ao conteudo principal", async () => {
		mockFetch(() => json(makeList([makeCar()])));
		renderApp("/cars");
		await screen.findByText("Toyota Corolla");
		expect(screen.getByRole("link", { name: "Pular para o conteúdo" })).toHaveAttribute("href", "#conteudo");
		expect(screen.getByRole("main")).toHaveAttribute("id", "conteudo");
	});
});

describe("usabilidade do catalogo", () => {
	it("apos paginar, o foco vai para a contagem de resultados", async () => {
		const user = userEvent.setup();
		mockFetch((url) => json(makeList([makeCar()], Number(url.searchParams.get("page")), 30)));
		renderApp("/cars");
		await screen.findByText(/Página 1 de 3/);
		await user.click(screen.getByRole("button", { name: "Próxima" }));
		await screen.findByText(/Página 2 de 3/);
		await waitFor(() => expect(document.activeElement).toHaveTextContent("30 veículos"));
		expect(document.activeElement).not.toBe(document.body);
	});

	it("mantem resultados anteriores visiveis e ocupados durante nova consulta", async () => {
		const user = userEvent.setup();
		let release: ((r: Response) => void) | null = null;
		mockFetch((url) => {
			if (url.searchParams.get("page") === "2") return new Promise<Response>((r) => (release = r));
			return json(makeList([makeCar()], 1, 30));
		});
		renderApp("/cars");
		await screen.findByText("Toyota Corolla");
		await user.click(screen.getByRole("button", { name: "Próxima" }));
		await waitFor(() => expect(release).not.toBeNull());
		const card = screen.getByText("Toyota Corolla");
		expect(card.closest('[aria-busy="true"]')).not.toBeNull();
		expect(screen.getByRole("button", { name: "Buscando…" })).toBeDisabled();
		await act(async () => release!(json(makeList([makeCar({ brand: "Honda", model: "Fit" })], 2, 30))));
		expect(await screen.findByText("Honda Fit")).toBeInTheDocument();
		expect(screen.getByText("Honda Fit").closest('[aria-busy="true"]')).toBeNull();
	});

	it("chips mostram filtros aplicados e removem um filtro na pagina 1", async () => {
		const user = userEvent.setup();
		const fetchMock = mockFetch(() => json(makeList([makeCar()], 1, 1)));
		const { router } = renderApp("/cars?brand=Toyota&model=Cor&page=2");
		await screen.findByText("Toyota Corolla");
		const chips = screen.getByRole("list", { name: "Filtros aplicados" });
		expect(chips).toHaveTextContent("Marca: Toyota");
		expect(chips).toHaveTextContent("Modelo: Cor");
		expect(screen.getByText("1 veículo")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Remover filtro Marca: Toyota" }));
		await waitFor(() => expect(router.state.location.search).toBe("?model=Cor"));
		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
		const url = requestedUrls(fetchMock)[1]!;
		expect(url.searchParams.has("brand")).toBe(false);
		expect(url.searchParams.get("page")).toBe("1");
		expect(screen.getByLabelText("Marca")).toHaveValue("");
	});

	it("sem filtros nao mostra chips", async () => {
		mockFetch(() => json(makeList([makeCar()])));
		renderApp("/cars");
		await screen.findByText("Toyota Corolla");
		expect(screen.queryByRole("list", { name: "Filtros aplicados" })).not.toBeInTheDocument();
	});

	it("cards alem da primeira linha usam lazy", async () => {
		const cars = Array.from({ length: 6 }, (_, i) =>
			makeCar({ id: `11111111-1111-4111-8111-00000000000${i}`, model: `Modelo${i}`, year: 2010 + i }),
		);
		mockFetch(() => json(makeList(cars)));
		renderApp("/cars");
		await screen.findByText("Toyota Modelo0");
		expect(screen.getByAltText("Foto do Toyota Modelo3 2013")).toHaveAttribute("loading", "eager");
		expect(screen.getByAltText("Foto do Toyota Modelo4 2014")).toHaveAttribute("loading", "lazy");
	});

	it("erro tem aparencia e papel distintos de estado vazio", async () => {
		mockFetch(() => json({ error: { code: "INTERNAL_ERROR", message: "x" } }, 500));
		renderApp("/cars");
		const alert = await screen.findByRole("alert");
		expect(alert.className).toMatch(/danger/);
	});
});

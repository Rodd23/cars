import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { sanitizeNumericFilters, validateNumericFilters } from "../src/features/catalog/filtersSchema.js";
import { json, makeCar, makeList, mockApi, renderApp, requestedUrls, type FetchMock } from "./helpers.js";

const USER = { id: "u1", email: "ana@empresa.com", name: "Ana" };

afterEach(() => {
	vi.unstubAllGlobals();
});

type Options = { session?: boolean; search?: () => Response | Promise<Response> };

function api({ session = true, search }: Options = {}): FetchMock {
	return mockApi(async (url, init) => {
		const method = init?.method ?? "GET";
		if (url.pathname === "/auth/me") return session ? json({ user: USER }) : json({ error: "Unauthorized" }, 401);
		if (url.pathname === "/cars/search" && method === "POST") {
			return search ? search() : json({ ...makeList([makeCar()]), filters: {}, ignored: [] });
		}
		if (url.pathname === "/cars" && method === "GET") return json(makeList([makeCar()], 1, 30));
		return json({ error: "x" }, 404);
	});
}

function posts(fn: FetchMock) {
	return fn.mock.calls.filter(([url, init]) => new URL(url).pathname === "/cars/search" && init?.method === "POST");
}

const FOUND = {
	...makeList([makeCar()], 1, 30),
	filters: { brand: "BMW", yearMin: 2018, yearMax: 2020, mileageMax: 50000 },
	ignored: ["cor preta"],
};

/** "Buscar" é o botão da busca inteligente; o dos filtros se chama "Filtrar". */
const smartButton = () => screen.getByRole("button", { name: "Buscar" });

type User = ReturnType<typeof userEvent.setup>;
const openRange = (user: User, name: RegExp) => user.click(screen.getByRole("button", { name }));

describe("busca inteligente (AC12)", () => {
	it("so aparece com sessao", async () => {
		api({ session: false });
		renderApp("/cars");
		await screen.findByText("Toyota Corolla");
		expect(screen.queryByLabelText("Busca inteligente")).not.toBeInTheDocument();
	});

	it("sucesso navega para /cars?filtros, mostra Entendi/Ignorado e paginar nao chama POST", async () => {
		const user = userEvent.setup();
		const fetchMock = api({ search: () => json(FOUND) });
		const { router } = renderApp("/cars?page=2");
		const input = await screen.findByLabelText("Busca inteligente");
		expect(input).toHaveAttribute("maxlength", "300");
		expect(input).toHaveAttribute("placeholder", "Descreva o carro: BMW até 50 mil km, de 2018 a 2020…");
		await user.type(input, "BMW de 2018 a 2020 com até 50 mil km");
		await user.click(smartButton());

		await waitFor(() =>
			expect(router.state.location.search).toBe("?brand=BMW&yearMin=2018&yearMax=2020&mileageMax=50000"),
		);
		const notice = await screen.findByText(/^Entendi:/);
		expect(notice).toHaveTextContent("Entendi: BMW, 2018–2020, até 50.000 km");
		expect(notice.closest("[role=status]")).toHaveTextContent("Ignorado: cor preta");
		expect(posts(fetchMock)).toHaveLength(1);
		expect(JSON.parse(posts(fetchMock)[0]![1]!.body as string)).toEqual({
			search: "BMW de 2018 a 2020 com até 50 mil km",
			pageSize: 12,
		});

		await screen.findByText("Toyota Corolla");
		await waitFor(() => {
			const gets = requestedUrls(fetchMock).filter((u) => u.pathname === "/cars");
			const last = gets[gets.length - 1]!;
			expect(last.searchParams.get("brand")).toBe("BMW");
			expect(last.searchParams.get("yearMin")).toBe("2018");
			expect(last.searchParams.get("yearMax")).toBe("2020");
			expect(last.searchParams.get("mileageMax")).toBe("50000");
			expect(last.searchParams.get("page")).toBe("1");
		});
		expect(screen.getByRole("button", { name: "Remover filtro Ano 2018–2020" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Remover filtro Até 50.000 km" })).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /Próxima/ }));
		await waitFor(() => expect(router.state.location.search).toContain("page=2"));
		await screen.findByText("Toyota Corolla");
		expect(posts(fetchMock)).toHaveLength(1);
	});

	it("filtros vazios dizem todos os veiculos", async () => {
		const user = userEvent.setup();
		api({ search: () => json({ ...makeList([makeCar()]), filters: {}, ignored: ["cor vermelha"] }) });
		const { router } = renderApp("/cars?brand=Fiat");
		await user.type(await screen.findByLabelText("Busca inteligente"), "carros vermelhos");
		await user.click(smartButton());
		await waitFor(() => expect(router.state.location.search).toBe(""));
		const notice = await screen.findByText(/^Entendi:/);
		expect(notice).toHaveTextContent("Entendi: todos os veículos");
		expect(notice.closest("[role=status]")).toHaveTextContent("Ignorado: cor vermelha");
	});

	it("bloqueia envio duplo e mostra Interpretando…", async () => {
		const user = userEvent.setup();
		let resolve!: (r: Response) => void;
		const fetchMock = api({ search: () => new Promise<Response>((r) => (resolve = r)) });
		renderApp("/cars");
		await user.type(await screen.findByLabelText("Busca inteligente"), "bmw{Enter}");
		const busy = await screen.findByRole("button", { name: "Interpretando…" });
		expect(busy).toBeDisabled();
		await user.type(screen.getByLabelText("Busca inteligente"), "{Enter}");
		expect(posts(fetchMock)).toHaveLength(1);
		resolve(json(FOUND));
		await waitFor(() => expect(screen.queryByRole("button", { name: "Interpretando…" })).not.toBeInTheDocument());
	});
});

describe("busca inteligente: destaque", () => {
	it("sugestao preenche o campo sem enviar", async () => {
		const user = userEvent.setup();
		const fetchMock = api();
		renderApp("/cars");
		const input = await screen.findByLabelText("Busca inteligente");
		await user.click(screen.getByRole("button", { name: "Toyota a partir de 2020" }));
		expect(input).toHaveValue("Toyota a partir de 2020");
		expect(input).toHaveFocus();
		expect(posts(fetchMock)).toHaveLength(0);
	});

	it("tecla / foca a busca, exceto quando o foco ja esta em um campo de texto", async () => {
		const user = userEvent.setup();
		api();
		renderApp("/cars");
		const input = await screen.findByLabelText("Busca inteligente");
		await screen.findByText("Toyota Corolla");
		await user.keyboard("/");
		expect(input).toHaveFocus();
		expect(input).toHaveValue("");

		const brand = screen.getByLabelText("Marca");
		await user.click(brand);
		await user.keyboard("/");
		expect(brand).toHaveFocus();
		expect(brand).toHaveValue("/");
	});
});

describe("busca inteligente: erros (AC13)", () => {
	it.each([
		[422, "SEARCH_NOT_UNDERSTOOD", "Não entendi a busca. Tente citar marca, modelo, ano ou quilometragem."],
		[503, "AI_UNAVAILABLE", "A busca inteligente está indisponível. Use os filtros."],
		[429, "RATE_LIMITED", "Muitas buscas. Aguarde um minuto."],
	])("%i mostra a mensagem do backend e preserva a tela", async (status, code, message) => {
		const user = userEvent.setup();
		api({ search: () => json({ error: { code, message } }, status) });
		const { router } = renderApp("/cars?brand=Toyota");
		await screen.findByText("Toyota Corolla");
		const input = screen.getByLabelText("Busca inteligente");
		await user.type(input, "algo");
		await user.click(smartButton());
		const alert = await screen.findByRole("alert");
		expect(alert).toHaveTextContent(message);
		expect(input).toHaveFocus();
		expect(router.state.location.search).toBe("?brand=Toyota");
		expect(screen.getByText("Toyota Corolla")).toBeInTheDocument();
		expect(screen.getByLabelText("Marca")).toHaveValue("Toyota");
	});

	it("usa mensagem padrao quando o corpo nao traz erro", async () => {
		const user = userEvent.setup();
		api({ search: () => new Response("", { status: 503 }) });
		renderApp("/cars");
		await user.type(await screen.findByLabelText("Busca inteligente"), "algo{Enter}");
		expect(await screen.findByRole("alert")).toHaveTextContent("A busca inteligente está indisponível. Use os filtros.");
	});

	it("401 expira a sessao e esconde o campo", async () => {
		const user = userEvent.setup();
		api({ search: () => json({ error: "Unauthorized" }, 401) });
		renderApp("/cars");
		await user.type(await screen.findByLabelText("Busca inteligente"), "algo{Enter}");
		await waitFor(() => expect(screen.queryByLabelText("Busca inteligente")).not.toBeInTheDocument());
	});
});

describe("filtros de faixa (AC14)", () => {
	it("le a URL, envia na consulta e mostra chips removiveis", async () => {
		const user = userEvent.setup();
		const fetchMock = api({ session: false });
		const { router } = renderApp("/cars?yearMin=2018&yearMax=2020&mileageMax=50000&priceMax=60000");
		await screen.findByText("Toyota Corolla");
		const url = requestedUrls(fetchMock).find((u) => u.pathname === "/cars")!;
		expect(url.searchParams.get("yearMin")).toBe("2018");
		expect(url.searchParams.get("priceMax")).toBe("60000");
		// Os botões das faixas mostram o valor ativo; os campos ficam dentro dos popovers.
		expect(screen.getByRole("button", { name: "Ano: 2018–2020" })).toBeInTheDocument();
		expect(screen.queryByLabelText("Ano mínimo")).not.toBeInTheDocument();
		await openRange(user, /^Ano/);
		expect(screen.getByLabelText("Ano mínimo")).toHaveValue("2018");
		await openRange(user, /^Preço/);
		expect(screen.getByLabelText("Preço máximo (R$)")).toHaveValue("60000");
		expect(screen.getByText("Ano 2018–2020")).toBeInTheDocument();
		expect(screen.getByText("Até 50.000 km")).toBeInTheDocument();
		expect(screen.getByText(/^Até R\$\s60\.000$/)).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Remover filtro Ano 2018–2020" }));
		await waitFor(() => expect(router.state.location.search).toBe("?mileageMax=50000&priceMax=60000"));
	});

	it("preenche pelo formulario e reflete na URL", async () => {
		const user = userEvent.setup();
		api({ session: false });
		const { router } = renderApp("/cars");
		await screen.findByText("Toyota Corolla");
		await openRange(user, /^Ano/);
		await user.type(screen.getByLabelText("Ano mínimo"), "2018");
		await openRange(user, /^Quilometragem/);
		await user.click(screen.getByRole("button", { name: "50 mil" }));
		expect(screen.getByLabelText("Quilometragem máxima (km)")).toHaveValue("50000");
		// Enter dentro do popover envia o formulário (campo associado por form=).
		await user.type(screen.getByLabelText("Quilometragem máxima (km)"), "{Enter}");
		await waitFor(() => expect(router.state.location.search).toBe("?yearMin=2018&mileageMax=50000"));
	});

	it("bloqueia valores invalidos no cliente", async () => {
		const user = userEvent.setup();
		const fetchMock = api({ session: false });
		const { router } = renderApp("/cars");
		await screen.findByText("Toyota Corolla");
		const before = fetchMock.mock.calls.length;
		await openRange(user, /^Ano/);
		await user.type(screen.getByLabelText("Ano mínimo"), "2020");
		await user.type(screen.getByLabelText("Ano máximo"), "2018");
		await openRange(user, /^Preço/);
		await user.type(screen.getByLabelText("Preço máximo (R$)"), "12a");
		await user.click(screen.getByRole("button", { name: "Filtrar" }));
		// O popover do primeiro erro abre sozinho, com a mensagem dentro dele e o foco no campo.
		expect(await screen.findByText("O ano mínimo não pode ser maior que o máximo")).toBeInTheDocument();
		expect(screen.getByLabelText("Ano máximo")).toHaveAttribute("aria-invalid", "true");
		await waitFor(() => expect(screen.getByLabelText("Ano máximo")).toHaveFocus());
		expect(screen.getByRole("dialog")).toContainElement(screen.getByLabelText("Ano máximo"));
		await openRange(user, /^Preço/);
		expect(await screen.findByText("Use apenas dígitos")).toBeInTheDocument();
		expect(router.state.location.search).toBe("");
		expect(fetchMock.mock.calls.length).toBe(before);
	});

	it("valores invalidos na URL sao ignorados", async () => {
		const fetchMock = api({ session: false });
		renderApp("/cars?yearMin=abc&yearMax=1800&mileageMax=-5&priceMax=9999999999999&priceMin=100&mileageMin=9");
		await screen.findByText("Toyota Corolla");
		const url = requestedUrls(fetchMock).find((u) => u.pathname === "/cars")!;
		expect([...url.searchParams.keys()].sort()).toEqual(["mileageMin", "page", "pageSize", "priceMin"]);
	});
});

describe("filtros: Versao e Mais filtros", () => {
	afterEach(() => vi.unstubAllGlobals());

	it("em tela larga a Versao fica visivel e nao ha Mais filtros", async () => {
		api({ session: false });
		renderApp("/cars");
		await screen.findByText("Toyota Corolla");
		expect(screen.getByLabelText("Versão")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Mais filtros" })).not.toBeInTheDocument();
	});

	it("em tela estreita a Versao vai para o popover Mais filtros (um unico campo)", async () => {
		const user = userEvent.setup();
		const fetchMock = api({ session: false });
		vi.stubGlobal("matchMedia", (query: string) => ({
			matches: false,
			media: query,
			addEventListener: () => {},
			removeEventListener: () => {},
		}));
		const { router } = renderApp("/cars");
		await screen.findByText("Toyota Corolla");
		expect(screen.queryByLabelText("Versão")).not.toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Mais filtros" }));
		expect(screen.getAllByLabelText("Versão")).toHaveLength(1);
		await user.type(screen.getByLabelText("Versão"), "XEi");
		await user.click(screen.getByRole("button", { name: "Filtrar" }));
		await waitFor(() => expect(router.state.location.search).toBe("?version=XEi"));
		expect(requestedUrls(fetchMock).at(-1)!.searchParams.get("version")).toBe("XEi");
	});
});

describe("filtersSchema", () => {
	it("valida limites e ordem", () => {
		const base = { yearMin: "", yearMax: "", mileageMin: "", mileageMax: "", priceMin: "", priceMax: "" };
		expect(validateNumericFilters(base)).toEqual({});
		expect(validateNumericFilters({ ...base, yearMin: "1885" }).yearMin).toBeDefined();
		expect(validateNumericFilters({ ...base, mileageMax: "2000001" }).mileageMax).toBeDefined();
		expect(validateNumericFilters({ ...base, priceMax: "0" }).priceMax).toBeDefined();
		expect(validateNumericFilters({ ...base, mileageMin: "9", mileageMax: "5" }).mileageMax).toBeDefined();
		expect(sanitizeNumericFilters({ ...base, yearMin: "x", priceMax: "007" })).toMatchObject({ yearMin: "", priceMax: "7" });
	});
});

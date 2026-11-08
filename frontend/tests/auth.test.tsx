import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { buildCarFormSchema, validateCarForm, EMPTY_VALUES } from "../src/features/admin/carFormSchema.js";
import { sanitizeNext } from "../src/features/auth/safeNext.js";
import { json, makeCar, makeList, mockApi, renderApp, type FetchMock } from "./helpers.js";

const USER = { id: "u1", email: "ana@empresa.com", name: "Ana" };

afterEach(() => {
	vi.unstubAllGlobals();
	sessionStorage.clear();
});

type Session = { user: typeof USER | null };

/** API simulada com sessão em memória: login define o usuário, logout limpa. */
function api(session: Session, extra?: (url: URL, init?: RequestInit) => Response | Promise<Response> | undefined): FetchMock {
	return mockApi(async (url, init) => {
		const custom = await extra?.(url, init);
		if (custom) return custom;
		const method = init?.method ?? "GET";
		if (url.pathname === "/auth/me") return session.user ? json({ user: session.user }) : json({ error: "Unauthorized" }, 401);
		if (url.pathname === "/auth/login" && method === "POST") {
			session.user = USER;
			return json({ user: USER });
		}
		if (url.pathname === "/auth/logout") {
			session.user = null;
			return new Response(null, { status: 204 });
		}
		if (url.pathname === "/cars" && method === "GET") return json(makeList([makeCar()]));
		return json({ error: "x" }, 404);
	});
}

function callsTo(fn: FetchMock, path: string, method: string) {
	return fn.mock.calls.filter(([url, init]) => new URL(url).pathname === path && (init?.method ?? "GET") === method);
}

const VALID: Record<string, string> = {
	"Marca": "Toyota",
	"Modelo": "Corolla",
	"Ano": "2022",
	"Preço em reais": "50000",
	"Combustível": "Flex",
	"Câmbio": "Automático",
	"Quilometragem (km)": "45000",
};

/** Combustível e câmbio são grupos de opções fixas (radio), não campos de texto. */
const CHOICES = ["Combustível", "Câmbio"];

async function fill(user: ReturnType<typeof userEvent.setup>, values: Record<string, string> = VALID) {
	for (const [label, value] of Object.entries(values)) {
		if (CHOICES.includes(label)) {
			await user.click(screen.getByRole("radio", { name: value }));
			continue;
		}
		const input = screen.getByLabelText(label);
		await user.clear(input);
		await user.type(input, value);
	}
}

describe("sanitizeNext", () => {
	it("aceita só caminhos internos", () => {
		expect(sanitizeNext("/cars/new")).toBe("/cars/new");
		expect(sanitizeNext("/cars?page=2")).toBe("/cars?page=2");
		for (const bad of ["//evil.com", "https://evil.com", "http://evil.com/cars", "/\\evil.com", "cars", "", null, undefined, "/a//b", "/a\nb"]) {
			expect(sanitizeNext(bad)).toBe("/cars");
		}
	});
});

describe("carFormSchema", () => {
	const ok = { ...EMPTY_VALUES, brand: " Toyota ", model: "Corolla", year: "2022", price: "50000", fuel: "Flex", transmission: "CVT", mileage: "0" };

	it("converte e remove espaços; campos opcionais vazios são omitidos", () => {
		const result = validateCarForm(ok);
		expect(result).toEqual({
			ok: true,
			input: { brand: "Toyota", model: "Corolla", year: 2022, price: 50000, fuel: "Flex", transmission: "CVT", mileage: 0 },
		});
	});

	it("aplica os limites", () => {
		const schema = buildCarFormSchema(2026);
		const bad = validateCarForm(
			{ ...ok, brand: "x".repeat(81), year: "1885", price: "0", mileage: "2000001", imageUrl: "ftp://x.com/a.png", version: "v".repeat(121) },
			schema,
		);
		expect(bad.ok).toBe(false);
		if (!bad.ok) expect(Object.keys(bad.errors).sort()).toEqual(["brand", "imageUrl", "mileage", "price", "version", "year"]);
		expect(validateCarForm({ ...ok, year: "2027" }, schema).ok).toBe(true);
		expect(validateCarForm({ ...ok, year: "2028" }, schema).ok).toBe(false);
		expect(validateCarForm({ ...ok, price: "10000000000" }, schema).ok).toBe(false);
		expect(validateCarForm({ ...ok, imageUrl: "https://img.test/a.jpg" }, schema).ok).toBe(true);
	});
});

describe("barra superior (AC11)", () => {
	it("sem sessão mostra Entrar; durante o carregamento não mostra nada", async () => {
		let resolveMe!: (r: Response) => void;
		mockApi((url) => {
			if (url.pathname === "/auth/me") return new Promise<Response>((r) => (resolveMe = r));
			return json(makeList([makeCar()]));
		});
		renderApp("/cars");
		await screen.findByText("Toyota Corolla");
		expect(screen.queryByRole("link", { name: "Entrar" })).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Sair" })).not.toBeInTheDocument();
		await act(async () => resolveMe(json({ error: "Unauthorized" }, 401)));
		expect(await screen.findByRole("link", { name: "Entrar" })).toHaveAttribute("href", "/login");
	});

	it("com sessão mostra nome, Novo veículo e Sair; Sair encerra e volta ao catálogo", async () => {
		const session: Session = { user: USER };
		const fetchMock = api(session);
		const user = userEvent.setup();
		const { router } = renderApp("/cars/new");
		expect(await screen.findByText("Ana")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Novo veículo" })).toHaveAttribute("href", "/cars/new");
		expect(screen.queryByRole("link", { name: "Entrar" })).not.toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Menu de Ana" }));
		expect(screen.getByText("ana@empresa.com")).toBeInTheDocument();
		await user.click(await screen.findByRole("menuitem", { name: "Sair" }));
		await waitFor(() => expect(router.state.location.pathname).toBe("/cars"));
		expect(await screen.findByRole("link", { name: "Entrar" })).toBeInTheDocument();
		expect(screen.queryByText("Ana")).not.toBeInTheDocument();
		expect(callsTo(fetchMock, "/auth/logout", "POST")).toHaveLength(1);
		expect(fetchMock.mock.calls.every(([, init]) => init?.credentials === "include")).toBe(true);
	});
});

describe("tela de login", () => {
	it("não mostra a barra superior, mantém o main#conteudo e o link de pular", async () => {
		api({ user: null });
		renderApp("/login");
		await screen.findByRole("heading", { name: "Entrar" });
		expect(screen.queryByRole("link", { name: "Catálogo de veículos" })).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Tema" })).not.toBeInTheDocument();
		expect(screen.getByRole("main")).toHaveAttribute("id", "conteudo");
		expect(screen.getByRole("link", { name: "Pular para o conteúdo" })).toHaveAttribute("href", "#conteudo");
		expect(screen.getByRole("link", { name: "Voltar ao catálogo" })).toHaveAttribute("href", "/cars");
		expect(screen.getByText("Todo o estoque em um só lugar.")).toBeInTheDocument();
		expect(document.querySelector('img[src="/login-cover.jpg"]')).toHaveAttribute("alt", "");
	});

	it("mostra e oculta a senha", async () => {
		api({ user: null });
		const user = userEvent.setup();
		renderApp("/login");
		const password = await screen.findByLabelText("Senha");
		expect(password).toHaveAttribute("type", "password");
		await user.type(password, "segredo");
		await user.click(screen.getByRole("button", { name: "Mostrar senha" }));
		expect(password).toHaveAttribute("type", "text");
		expect(password).toHaveValue("segredo");
		await user.click(screen.getByRole("button", { name: "Ocultar senha" }));
		expect(password).toHaveAttribute("type", "password");
	});
});

describe("login e redirecionamento (AC12)", () => {
	it("/cars/new sem sessão vai para /login?next=/cars/new e volta depois do login", async () => {
		const session: Session = { user: null };
		const fetchMock = api(session);
		const user = userEvent.setup();
		const { router } = renderApp("/cars/new");
		await screen.findByRole("heading", { name: "Entrar" });
		expect(router.state.location.pathname + router.state.location.search).toBe("/login?next=/cars/new");
		expect(screen.getByLabelText("E-mail")).toHaveAttribute("autocomplete", "username");
		expect(screen.getByLabelText("Senha")).toHaveAttribute("autocomplete", "current-password");
		await user.type(screen.getByLabelText("E-mail"), "ana@empresa.com");
		await user.type(screen.getByLabelText("Senha"), "segredo-123456");
		await user.click(screen.getByRole("button", { name: "Entrar" }));
		await screen.findByRole("heading", { name: "Novo veículo" });
		expect(router.state.location.pathname).toBe("/cars/new");
		const [, init] = callsTo(fetchMock, "/auth/login", "POST")[0]!;
		expect(JSON.parse(init!.body as string)).toEqual({ email: "ana@empresa.com", password: "segredo-123456" });
		expect((init!.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
	});

	it.each(["//evil.com", "https://evil.com/x"])("next externo %s vai para /cars", async (bad) => {
		api({ user: null });
		const user = userEvent.setup();
		const { router } = renderApp(`/login?next=${encodeURIComponent(bad)}`);
		await user.type(await screen.findByLabelText("E-mail"), "ana@empresa.com");
		await user.type(screen.getByLabelText("Senha"), "segredo-123456");
		await user.click(screen.getByRole("button", { name: "Entrar" }));
		await waitFor(() => expect(router.state.location.pathname).toBe("/cars"));
	});

	it("usuário já logado em /login é redirecionado", async () => {
		api({ user: USER });
		const { router } = renderApp("/login?next=/cars/new");
		await waitFor(() => expect(router.state.location.pathname).toBe("/cars/new"));
	});

	it("401 mostra erro em role=alert, foca a senha e mostra Entrando… durante o envio", async () => {
		let resolveLogin!: (r: Response) => void;
		api({ user: null }, (url) =>
			url.pathname === "/auth/login" ? new Promise<Response>((r) => (resolveLogin = r)) : undefined,
		);
		const user = userEvent.setup();
		renderApp("/login");
		await user.type(await screen.findByLabelText("E-mail"), "ana@empresa.com");
		await user.type(screen.getByLabelText("Senha"), "errada");
		await user.click(screen.getByRole("button", { name: "Entrar" }));
		const pending = await screen.findByRole("button", { name: "Entrando…" });
		expect(pending).toBeDisabled();
		await act(async () => resolveLogin(json({ error: "Invalid credentials" }, 401)));
		expect(await screen.findByRole("alert")).toHaveTextContent("E-mail ou senha incorretos");
		await waitFor(() => expect(screen.getByLabelText("Senha")).toHaveFocus());
		expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
	});

	it("429 e erro de rede têm mensagens próprias", async () => {
		let mode: "429" | "network" = "429";
		api({ user: null }, (url) => {
			if (url.pathname !== "/auth/login") return undefined;
			if (mode === "network") throw new TypeError("failed");
			return json({ error: "Too many" }, 429);
		});
		const user = userEvent.setup();
		renderApp("/login");
		await user.type(await screen.findByLabelText("E-mail"), "ana@empresa.com");
		await user.type(screen.getByLabelText("Senha"), "x");
		await user.click(screen.getByRole("button", { name: "Entrar" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("alguns minutos");
		mode = "network";
		await user.click(screen.getByRole("button", { name: "Entrar" }));
		await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("conectar ao servidor"));
	});
});

describe("formulário de cadastro (AC13)", () => {
	it("mostra erros por campo, resumo e foca o primeiro inválido", async () => {
		const fetchMock = api({ user: USER });
		const user = userEvent.setup();
		renderApp("/cars/new");
		await screen.findByRole("heading", { name: "Novo veículo" });
		await user.click(screen.getByRole("button", { name: "Cadastrar veículo" }));
		const brand = screen.getByLabelText("Marca");
		await waitFor(() => expect(brand).toHaveFocus());
		expect(brand).toHaveAttribute("aria-invalid", "true");
		expect(brand).toHaveAccessibleDescription("Informe a marca.");
		expect(screen.getAllByRole("alert")[0]).toHaveTextContent("Corrija os campos");
		expect(screen.getByLabelText("Ano")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByLabelText("Versão (opcional)")).not.toHaveAttribute("aria-invalid");
		expect(callsTo(fetchMock, "/cars", "POST")).toHaveLength(0);
	});

	it("aceita só dígitos, formata milhares ao digitar e usa opções fixas", async () => {
		api({ user: USER });
		const user = userEvent.setup();
		renderApp("/cars/new");
		const price = await screen.findByLabelText("Preço em reais");
		expect(price).toHaveAttribute("inputmode", "numeric");
		await user.type(price, "5a0.000");
		expect(price).toHaveValue("50.000");
		await user.type(price, "0");
		expect(price).toHaveValue("500.000");
		const km = screen.getByLabelText("Quilometragem (km)");
		await user.type(km, "1234567");
		expect(km).toHaveValue("1.234.567");
		expect(screen.getAllByRole("radio")).toHaveLength(9);
		expect(screen.getByRole("radiogroup", { name: "Combustível" })).toBeInTheDocument();
		expect(screen.getByRole("radiogroup", { name: "Câmbio" })).toBeInTheDocument();
	});

	it("combustível e câmbio são obrigatórios: erro associado ao grupo e foco nele", async () => {
		const fetchMock = api({ user: USER });
		const user = userEvent.setup();
		renderApp("/cars/new");
		await screen.findByRole("heading", { name: "Novo veículo" });
		await fill(user, { Marca: "Toyota", Modelo: "Corolla", Ano: "2022", "Preço em reais": "50000", "Quilometragem (km)": "1" });
		await user.click(screen.getByRole("button", { name: "Cadastrar veículo" }));
		const fuel = screen.getByRole("radiogroup", { name: "Combustível" });
		expect(fuel).toHaveAccessibleDescription("Informe o combustível.");
		expect(screen.getByRole("radiogroup", { name: "Câmbio" })).toHaveAccessibleDescription("Informe o câmbio.");
		await waitFor(() => expect(within(fuel).getAllByRole("radio")[0]).toHaveFocus());
		expect(callsTo(fetchMock, "/cars", "POST")).toHaveLength(0);

		// Selecionar e desmarcar volta a ser inválido.
		await user.click(screen.getByRole("radio", { name: "Flex" }));
		expect(screen.getByRole("radio", { name: "Flex" })).toBeChecked();
		await user.click(screen.getByRole("radio", { name: "Flex" }));
		expect(screen.getByRole("radio", { name: "Flex" })).not.toBeChecked();
		await user.click(screen.getByRole("button", { name: "Cadastrar veículo" }));
		expect(await screen.findByText("Combustível: Informe o combustível.")).toBeInTheDocument();
	});

	it("a pré-visualização mostra o card do catálogo atualizado ao vivo, sem link", async () => {
		api({ user: USER });
		const user = userEvent.setup();
		renderApp("/cars/new");
		await screen.findByRole("heading", { name: "Novo veículo" });
		expect(screen.getByRole("heading", { name: "Como vai aparecer no catálogo" })).toBeInTheDocument();
		const placeholder = screen.getByText("Marca Modelo").closest("li")!;
		expect(placeholder.querySelector("a")).toBeNull();
		await fill(user);
		const card = screen.getByText("Toyota Corolla").closest("li")!;
		expect(card).toHaveTextContent(/R\$.50\.000/);
		expect(card).toHaveTextContent("2022");
		expect(card).toHaveTextContent("45.000 km");
		expect(card).toHaveTextContent("Flex");
		expect(card).toHaveTextContent("Automático");
		expect(card.querySelector("a")).toBeNull();
		expect(card).toHaveTextContent("Sem imagem");
		await user.type(screen.getByLabelText("Versão (opcional)"), "XEi");
		expect(card).toHaveTextContent("XEi");
	});

	it("tem Cancelar apontando para o catálogo", async () => {
		api({ user: USER });
		renderApp("/cars/new");
		await screen.findByRole("heading", { name: "Novo veículo" });
		expect(screen.getByRole("link", { name: "Cancelar" })).toHaveAttribute("href", "/cars");
	});

	it("mapeia os erros 400 do servidor para os campos", async () => {
		api({ user: USER }, (url, init) =>
			url.pathname === "/cars" && init?.method === "POST"
				? json({ error: "Validation error", details: [{ path: "model", message: "Modelo inválido no servidor" }] }, 400)
				: undefined,
		);
		const user = userEvent.setup();
		renderApp("/cars/new");
		await screen.findByRole("heading", { name: "Novo veículo" });
		await fill(user);
		await user.click(screen.getByRole("button", { name: "Cadastrar veículo" }));
		const model = screen.getByLabelText("Modelo");
		await waitFor(() => expect(model).toHaveAttribute("aria-invalid", "true"));
		expect(model).toHaveAccessibleDescription("Modelo inválido no servidor");
		await waitFor(() => expect(model).toHaveFocus());
		expect(screen.getByLabelText("Marca")).toHaveValue("Toyota");
	});

	it("bloqueia envio duplo e, no sucesso, navega aos detalhes com aviso", async () => {
		const created = makeCar({ id: "22222222-2222-4222-8222-222222222222" });
		let resolvePost!: (r: Response) => void;
		const fetchMock = api({ user: USER }, (url, init) => {
			if (url.pathname === "/cars" && init?.method === "POST") return new Promise<Response>((r) => (resolvePost = r));
			if (url.pathname === `/cars/${created.id}`) return json(created);
			return undefined;
		});
		const user = userEvent.setup();
		const { router } = renderApp("/cars/new");
		await screen.findByRole("heading", { name: "Novo veículo" });
		await fill(user, { ...VALID, "Versão (opcional)": "XEi" });
		const submit = screen.getByRole("button", { name: "Cadastrar veículo" });
		await user.click(submit);
		await user.click(screen.getByRole("button", { name: "Salvando…" }));
		expect(callsTo(fetchMock, "/cars", "POST")).toHaveLength(1);
		const [, init] = callsTo(fetchMock, "/cars", "POST")[0]!;
		expect(JSON.parse(init!.body as string)).toEqual({
			brand: "Toyota", model: "Corolla", version: "XEi", year: 2022, price: 50000,
			fuel: "Flex", transmission: "Automático", mileage: 45000,
		});
		await act(async () => resolvePost(json(created, 201)));
		await waitFor(() => expect(router.state.location.pathname).toBe(`/cars/${created.id}`));
		expect(await screen.findByRole("status")).toHaveTextContent("Veículo cadastrado");
	});

	it("500 mostra alerta e mantém os dados", async () => {
		api({ user: USER }, (url, init) =>
			url.pathname === "/cars" && init?.method === "POST" ? json({ error: "Failed to create car" }, 500) : undefined,
		);
		const user = userEvent.setup();
		renderApp("/cars/new");
		await screen.findByRole("heading", { name: "Novo veículo" });
		await fill(user);
		await user.click(screen.getByRole("button", { name: "Cadastrar veículo" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("Seus dados foram mantidos");
		expect(screen.getByLabelText("Marca")).toHaveValue("Toyota");
		expect(screen.getByRole("button", { name: "Cadastrar veículo" })).toBeEnabled();
	});
});

describe("sessão expirada no envio (AC14)", () => {
	it("401 preserva o rascunho, leva ao login e restaura ao voltar", async () => {
		const session: Session = { user: USER };
		api(session, (url, init) => {
			if (url.pathname === "/cars" && init?.method === "POST") {
				session.user = null;
				return json({ error: "Unauthorized" }, 401);
			}
			return undefined;
		});
		const user = userEvent.setup();
		const { router } = renderApp("/cars/new");
		await screen.findByRole("heading", { name: "Novo veículo" });
		await fill(user, { ...VALID, "Versão (opcional)": "XEi" });
		await user.click(screen.getByRole("button", { name: "Cadastrar veículo" }));
		await screen.findByRole("heading", { name: "Entrar" });
		expect(router.state.location.pathname + router.state.location.search).toBe("/login?next=/cars/new");
		expect(sessionStorage.getItem("catalog-car-draft")).toContain("Toyota");
		await user.type(screen.getByLabelText("E-mail"), "ana@empresa.com");
		await user.type(screen.getByLabelText("Senha"), "segredo-123456");
		await user.click(screen.getByRole("button", { name: "Entrar" }));
		await screen.findByRole("heading", { name: "Novo veículo" });
		expect(screen.getByLabelText("Marca")).toHaveValue("Toyota");
		expect(screen.getByLabelText("Versão (opcional)")).toHaveValue("XEi");
		expect(screen.getByLabelText("Preço em reais")).toHaveValue("50.000");
		await waitFor(() => expect(sessionStorage.getItem("catalog-car-draft")).toBeNull());
	});
});

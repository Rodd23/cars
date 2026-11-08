# Arquitetura atual

## Escopo

A raiz Git está em `cars/`, com a aplicação em `backend/`. O código implementa uma API Node.js em TypeScript ESM com Fastify, Zod, Drizzle ORM, PostgreSQL e OpenAI SDK. `frontend/` contém a interface de consulta do catálogo (Vite, React e React Router), implementada em 07/11/2026, e o login e cadastro de veículos da spec 003, também implementados em 07/11/2026 com migration `users`/`sessions` aplicada em 07/11/2026 no banco Neon `neondb` configurado em `DATABASE_URL`, com autorização do usuário. Versões declaradas e resolvidas estão em `backend/package.json` e `backend/package-lock.json`; as versões de Node.js, npm e do servidor PostgreSQL não estão fixadas.

## Fluxos e módulos

```text
server.ts → buildApp() → rotas
  GET /cars, GET /cars/:id → catalog (schema → serviço → CarsRepository) → Drizzle → PostgreSQL
  POST /cars/search (rate limit por usuário) → SearchInterpreter → OpenAI (tool buscar_carros)
                                             → validação com catalogQuerySchema
                                             → CatalogService.listCars → CarsRepository → PostgreSQL
  POST /cars → cadastro → CarsRepository → PostgreSQL

auth/login, auth/logout, auth/me → AuthService → AuthRepository → PostgreSQL (users, sessions)
requireSession (preHandler de POST /cars e POST /cars/search) → sessions → request.user
```

| Local | Responsabilidade |
|---|---|
| `src/server.ts` | Inicializa HTTP em `0.0.0.0` com porta configurável |
| `src/app.ts` | Constrói Fastify, logger, CORS, `/health` e rotas |
| `src/config/env.ts` | Carrega dotenv e valida configuração com Zod |
| `src/config/cors.ts` | Valida `CORS_ORIGINS` e monta opções do `@fastify/cors` |
| `src/db/client.ts` | Pool `pg` e cliente Drizzle (valida a configuração completa da API) |
| `src/db/create-db.ts` | `createDb(url)` para o CLI, que precisa só de `DATABASE_URL` |
| `src/db/schema/` | Tabelas `cars`, `users` e `sessions` |
| `src/db/migrations/` | Migrations `0000` (cars) e `0001` (users/sessions, aplicada em 07/11/2026 no Neon `neondb`) e metadados Drizzle |
| `src/modules/cars/` | Rotas, controllers, serviços, schemas e repositório; cadastro em `cars-create.controller.ts` e `cars-write.routes.ts` |
| `src/modules/cars/search/` | Interpretação de busca (`search-interpreter.ts`), controller e rota `POST /cars/search` (`ai-search.controller.ts`, `ai-search.routes.ts`) |
| `src/modules/auth/` | Login, logout e `/auth/me`; `password.ts` (scrypt), `auth.guard.ts` (`requireSession`, `requireAllowedOrigin`) e `user-admin.ts` (lógica do CLI) |
| `src/scripts/user.ts` | CLI `user:create` (criar usuário e `--reset-password`) |

## Contratos implementados

- `GET /health`: liveness com `{ "status": "ok" }`; não verifica banco nem OpenAI. Substituiu `GET /teste` em 07/11/2026.
- `POST /cars`: exige sessão (`401` sem cookie válido), valida criação com os limites da spec 003, insere veículo e responde `201`. Erros: `400` com `{ "error": "Validation error", "details": [{ "path", "message" }] }`; `500` sem mensagem interna. `403` para `Origin` fora de `CORS_ORIGINS`.
- `POST /cars/search`: exige sessão (`401` sem cookie). Recebe `{ "search": string (1 a 300 caracteres), "pageSize"?: 1 a 100 (padrão 12) }` e responde `200 { items, pagination, filters, ignored }` com a primeira página. Erros `{ "error": { "code", "message" } }`: `400 INVALID_REQUEST`, `422 SEARCH_NOT_UNDERSTOOD`, `429 RATE_LIMITED` (10 por minuto por usuário, em memória), `503 AI_UNAVAILABLE` e `500 INTERNAL_ERROR`. Mensagens do provedor e do banco não são devolvidas.
- `POST /auth/login`: recebe `{ "email", "password" }`; `200 { "user": { id, email, name } }` com cookie `sid` (`HttpOnly`, `SameSite=Lax`, `Secure` em produção, `Max-Age` igual à duração da sessão); `401 { "error": "Invalid credentials" }` sem distinguir a causa; `429` após 5 tentativas por minuto por IP.
- `POST /auth/logout`: `204` sempre, idempotente; apaga a sessão e o cookie.
- `GET /auth/me`: `200 { "user": { id, email, name } }`; `401 { "error": "Unauthorized" }`.
- `GET /cars`: leitura paginada com filtros de marca/modelo/versão e faixas inclusivas de ano (1886 até o ano atual + 1), quilometragem (0 a 2.000.000; `mileage` nulo fica de fora) e preço (1 a 9.999.999.999 reais), defaults de página 1 e tamanho 12 (máximo 100), ordenação por criação e UUID decrescentes, e total de resultados. Valor inválido ou chave desconhecida gera 400.
- `GET /cars/:id`: detalhes com UUID validado, resposta 404 para ausência e erros seguros nos novos endpoints.

O submódulo `backend/src/modules/cars/catalog/` separa schemas, controller, serviço e plugin de rotas GET. Recebe o repositório por injeção, permitindo testes sem carregar configuração ou serviços reais. O repositório usa transação somente leitura com snapshot repeatable read para total e página consistentes entre si. Os filtros do `GET /cars` escapam curingas literais (`%` e `_`), inclusive os valores vindos da IA.

A busca envia o texto à OpenAI Chat Completions, uma chamada por busca, com tool obrigatória `buscar_carros` (`strict: true`, `temperature: 0`, timeout de 10 s e 1 nova tentativa). Os argumentos (`marca`, `nome`, `versao`, `ano`, `ano_min`, `ano_max`, `km_min`, `km_max`, `preco_min`, `preco_max`, `ignorados`) passam por um Zod estrito e pelo schema de `GET /cars`; falha gera 422 e nenhuma consulta. Os filtros resultantes seguem para `CatalogService.listCars`, o mesmo caminho do `GET /cars`, e a rota devolve a primeira página. Critérios que a IA reconhece mas o catálogo não filtra (ex.: cor) voltam em `ignored`. O builder do catálogo combina condições com `AND`, usa `ILIKE` escapado para marca, modelo e versão, e comparações `gte`/`lte` para as faixas. Não há embeddings ou busca vetorial.

Cada busca gera um log com `userId`, `durationMs`, tokens de entrada e saída, `outcome` e os nomes dos filtros. O texto e os valores não são logados.

## Persistência e configuração

A tabela `cars` contém UUID, marca, modelo, versão, ano, preço, combustível, transmissão, quilometragem, URL de imagem e timestamps. `price` é `numeric(12,2)`; a API aceita inteiro positivo até 9.999.999.999, convertido para string no repositório. Alguns campos obrigatórios na API são nullable no banco.

As tabelas `users` (e-mail único em minúsculas, nome, hash de senha `scrypt$...`, `disabled_at`) e `sessions` (`id` é o SHA-256 do token, `user_id` com FK `ON DELETE CASCADE`, `expires_at`) foram definidas na spec 003. Sessões são absolutas, com duração de `SESSION_TTL_HOURS`. A migration `0001_smart_red_shift.sql` foi gerada e só cria essas tabelas e índices. Foi aplicada em 07/11/2026 no banco Neon `neondb` configurado em `DATABASE_URL`, com autorização do usuário; não havia outros bancos envolvidos. Recuperação: `DROP TABLE sessions, users`.

Há migrations `0000_noisy_rhino.sql` e `0001_smart_red_shift.sql`. Sua presença não confirma aplicação em qualquer banco. `drizzle.config.ts` usa `DATABASE_URL` diretamente; não passa pela validação de `env.ts`.

As variáveis e comandos estão descritos em [development.md](development.md).

## Frontend

`frontend/` é uma SPA com Vite 8, React 19, React Router 8 (`createBrowserRouter`), TypeScript 7 estrito, Tailwind CSS v4 e componentes no estilo shadcn/ui sobre `radix-ui`, com ícones `lucide-react`. O refinamento visual (spec 005) foi implementado em 07/11/2026 e substituiu os CSS Modules. Consome `GET /cars` e `GET /cars/:id` por `fetch` com AbortController, a partir de `VITE_API_URL`, e, para login e cadastro, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` e `POST /cars`, com `credentials: "include"`. A busca por IA (`POST /cars/search`) é chamada pelo campo "Busca inteligente", só com sessão; o resultado navega para `GET /cars` com os filtros na URL, e a paginação não chama a IA de novo.

| Local | Responsabilidade |
|---|---|
| `src/api/` | Cliente HTTP, tipos e erro tipado (404, http, rede) |
| `src/app/routes.tsx` | Layout raiz (barra superior, skip link, `main`, `ScrollRestoration`) e rotas `/`, `/cars`, `/cars/:id`, `/login`, `/cars/new` (protegida) e página não encontrada |
| `src/features/auth/` | `AuthProvider`/`useAuth` (estado da sessão), `RequireAuth`, `LoginPage` e `safeNext` (valida o redirecionamento) |
| `src/features/admin/` | `carFormSchema` (Zod, espelha os limites do backend) e `CarFormPage` |
| `src/app/theme.ts`, `src/app/documentTitle.ts` | Preferência de tema (`localStorage` + `data-theme`) e título da aba por página |
| `src/features/catalog/` | Páginas, cards e skeleton, filtros, resumo com chips, paginação, formatação e hook de consulta |
| `src/components/` | `TopBar` (menu do usuário e seletor de tema), `CarImage` (fallback local) e estados de tela |
| `src/components/ui/` | Componentes base no estilo shadcn/ui, escritos no repositório (`button`, `input`, `label`, `badge`, `popover`, `dropdown-menu`, `toggle-group`, `skeleton`), sobre o pacote `radix-ui` para foco, teclado e portal |
| `src/lib/` | `cn()` (`clsx` + `tailwind-merge`) e `useMediaQuery` |
| `src/styles/global.css` | Entrada do Tailwind (`@import "tailwindcss"`), tokens e temas claro/escuro de [frontend/DESIGN.md](../frontend/DESIGN.md), expostos como classes pelo `@theme inline` |

Filtros, página e navegação ficam na query string; a tela de detalhes retorna ao catálogo pelo `location.state`, e a posição de rolagem é restaurada por URL. Estilização por classes utilitárias do Tailwind v4, pelo plugin `@tailwindcss/vite` em `vite.config.ts`; não há CSS Modules. Um script inline em `index.html` aplica o tema salvo antes da primeira pintura. A foto de capa do login é um arquivo local em `public/`. Testes com Vitest, jsdom e `fetch` mockado. A interface depende de `CORS_ORIGINS` no backend para a origem de desenvolvimento. Detalhes de uso estão em [frontend/README.md](../frontend/README.md).

## Limitações e riscos confirmados

- Risco: a tool usa `strict: true`. Se `OPENAI_MODEL` não aceitar essa forma de tool, toda busca responde 503. Só o AC16 da spec 004 (chamada real à OpenAI, não autorizada) confirmaria o modelo configurado.
- Critérios não suportados pela tool (cor, combustível, câmbio) não são filtrados; a busca os informa em `ignored`.
- Fora de escopo da spec 004: busca vetorial, filtros de combustível, câmbio e cor, ordenação por relevância ou preço, histórico, cache e orçamento mensal com bloqueio.
- Erros de rotas fora da busca não foram revisados quanto a mensagens internas.
- Autenticação existe só para login, cadastro e busca IA (`POST /cars/search`). Não há papéis: todo usuário autenticado cadastra. Não há edição, exclusão, gestão de usuários pela interface nem revogação de sessão por tela; uma sessão roubada vale até expirar.
- Rate limit em `POST /auth/login` (por IP) e em `POST /cars/search` (10 por minuto por usuário), ambos em memória. Sem `trustProxy` configurado, o limite de login pode valer para o IP do proxy.
- Frontend e API precisam ser *same-site* para o cookie `Lax` ser enviado.
- A migration `0001` foi aplicada no Neon `neondb` em 07/11/2026; o fluxo login → cadastro → logout contra PostgreSQL isolado está pendente (AC17 da spec 003).
- CORS aceita somente a lista exata de `CORS_ORIGINS` (padrão `http://localhost:5173` fora de produção; obrigatório em produção). Requisições sem cabeçalho `Origin`, como curl, continuam atendidas: CORS não é autenticação, e a exposição efetiva depende da infraestrutura não documentada.
- A configuração OpenAI é obrigatória na inicialização, inclusive para rotas sem IA.
- O texto de busca (até 300 caracteres) é enviado à OpenAI, com custo e latência. Timeout de 10 s e 1 nova tentativa; sem bloqueio por orçamento.
- Há diferenças entre limites Zod e limites de colunas SQL. Preço e nulabilidade exigem cuidado ao evoluir contratos.

## Evolução proposta

A interface de consulta consome contratos HTTP explícitos; banco e credenciais OpenAI permanecem no backend. A raiz Git foi reorganizada para `cars/`, preservando o histórico. Não há workspaces ou pacotes compartilhados. Consulte [roadmap.md](roadmap.md).

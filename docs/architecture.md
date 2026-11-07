# Arquitetura atual

## Escopo

A raiz Git está em `cars/`, com a aplicação em `backend/`. O código implementa uma API Node.js em TypeScript ESM com Fastify, Zod, Drizzle ORM, PostgreSQL e OpenAI SDK. `frontend/` contém a interface de consulta do catálogo (Vite, React e React Router), implementada em 07/11/2026. Versões declaradas e resolvidas estão em `backend/package.json` e `backend/package-lock.json`; as versões de Node.js, npm e do servidor PostgreSQL não estão fixadas.

## Fluxos e módulos

```text
server.ts → buildApp() → rotas → CarsController → CarsService
                                                ├─ CarsRepository → Drizzle → PostgreSQL
                                                └─ AiSearchAgentService → OpenAI
                                                    └─ filtros → CarsRepository
                                                        └─ buildSearchQuery → PostgreSQL
```

| Local | Responsabilidade |
|---|---|
| `src/server.ts` | Inicializa HTTP em `0.0.0.0` com porta configurável |
| `src/app.ts` | Constrói Fastify, logger, CORS, `/health` e rotas |
| `src/config/env.ts` | Carrega dotenv e valida configuração com Zod |
| `src/config/cors.ts` | Valida `CORS_ORIGINS` e monta opções do `@fastify/cors` |
| `src/db/client.ts` | Pool `pg` e cliente Drizzle |
| `src/db/schema/` | Tabela `cars` |
| `src/db/migrations/` | Migration inicial e metadados Drizzle |
| `src/modules/cars/` | Rotas, controllers, serviços, schemas e repositório |
| `src/modules/cars/search/` | Interpretação de busca e condições SQL |

## Contratos implementados

- `GET /health`: liveness com `{ "status": "ok" }`; não verifica banco nem OpenAI. Substituiu `GET /teste` em 07/11/2026.
- `POST /cars`: valida criação, insere veículo e responde `201`.
- `POST /cars/search`: recebe `{ "search": "texto" }` e responde um array de veículos.
- `GET /cars`: leitura paginada com filtros tradicionais de marca/modelo/versão, defaults de página 1 e tamanho 12 (máximo 100), ordenação por criação e UUID decrescentes, e total de resultados.
- `GET /cars/:id`: detalhes com UUID validado, resposta 404 para ausência e erros seguros nos novos endpoints.

O submódulo `backend/src/modules/cars/catalog/` separa schemas, controller, serviço e plugin de rotas GET. Recebe o repositório por injeção, permitindo testes sem carregar configuração ou serviços reais. O repositório usa transação somente leitura com snapshot repeatable read para total e página consistentes entre si. Os filtros dos novos GET escapam curingas literais, preservando o comportamento anterior da busca IA.

A busca envia o texto à OpenAI Chat Completions com tool obrigatória `buscar_carros`. Argumentos `marca`, `nome` e `versao` são mapeados para `brand`, `model` e `version`. O query builder combina condições `ILIKE` com `AND`. Não há embeddings ou busca vetorial.

## Persistência e configuração

A tabela `cars` contém UUID, marca, modelo, versão, ano, preço, combustível, transmissão, quilometragem, URL de imagem e timestamps. `price` é `numeric(12,2)`; a API aceita inteiro positivo, convertido para string no repositório. Alguns campos obrigatórios na API são nullable no banco.

Há uma migration `0000_noisy_rhino.sql`. Sua presença não confirma aplicação em qualquer banco. `drizzle.config.ts` usa `DATABASE_URL` diretamente; não passa pela validação de `env.ts`.

As variáveis e comandos estão descritos em [development.md](development.md).

## Frontend

`frontend/` é uma SPA com Vite 8, React 19, React Router 8 (`createBrowserRouter`), TypeScript 7 estrito e CSS Modules. Não usa o backend diretamente: consome `GET /cars` e `GET /cars/:id` por `fetch` com AbortController, a partir de `VITE_API_URL`. Não chama `POST` nem a busca por IA.

| Local | Responsabilidade |
|---|---|
| `src/api/` | Cliente HTTP, tipos e erro tipado (404, http, rede) |
| `src/app/routes.tsx` | Rotas `/`, `/cars`, `/cars/:id` e página não encontrada |
| `src/features/catalog/` | Páginas, cards, filtros, paginação, formatação e hook de consulta |
| `src/components/` | `CarImage` (fallback local) e estados de tela |

Filtros, página e navegação ficam na query string; a tela de detalhes retorna ao catálogo pelo `location.state`. Testes com Vitest, jsdom e `fetch` mockado. A interface depende de `CORS_ORIGINS` no backend para a origem de desenvolvimento. Detalhes de uso estão em [frontend/README.md](../frontend/README.md).

## Limitações e riscos confirmados

- Prompt menciona ano e quilometragem, mas tool, parser e query builder não implementam esses filtros.
- Falta de tool, JSON inválido ou falha na validação dos argumentos pode produzir filtros vazios. Sem filtros, todo o catálogo é consultado.
- A busca IA POST não tem paginação; os novos GET têm paginação. Não há autenticação, autorização ou rate limiting implementados.
- CORS aceita somente a lista exata de `CORS_ORIGINS` (padrão `http://localhost:5173` fora de produção; obrigatório em produção). Requisições sem cabeçalho `Origin`, como curl, continuam atendidas: CORS não é autenticação, e a exposição efetiva depende da infraestrutura não documentada.
- Erros HTTP podem incluir mensagens internas de banco ou provedor.
- A configuração OpenAI é obrigatória na inicialização, inclusive para rotas sem IA.
- O texto de busca é enviado a um serviço externo, com custo e latência. Não há política de timeout/retry definida explicitamente pela aplicação.
- Há diferenças entre limites Zod e limites de colunas SQL. Preço e nulabilidade exigem cuidado ao evoluir contratos.

## Evolução proposta

A interface de consulta consome contratos HTTP explícitos; banco e credenciais OpenAI permanecem no backend. A raiz Git foi reorganizada para `cars/`, preservando o histórico. Não há workspaces ou pacotes compartilhados. Consulte [roadmap.md](roadmap.md).

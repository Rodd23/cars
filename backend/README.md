# Projeto Backend - Cars

## 1. Visão geral

Este backend é uma API REST em TypeScript usando Fastify, Drizzle ORM em PostgreSQL e Zod para validação. O módulo de carros oferece cadastro de veículos, listagem paginada com filtros e busca em linguagem natural: a OpenAI traduz o texto em filtros validados, e a consulta reaproveita `GET /cars`. O módulo `auth` oferece login por sessão com cookie; cadastro e busca por IA exigem sessão. A consulta do catálogo é pública. Especificação: [spec 003](../docs/specs/003-login-cadastro/spec.md).

## 2. Tecnologias principais

- Node.js + TypeScript (ESM)
- Fastify
- `@fastify/cors` (somente as origens listadas em `CORS_ORIGINS`, com `credentials`)
- `@fastify/cookie` (cookie de sessão) e `@fastify/rate-limit` (limite de tentativas em `/auth/login`, por IP, e de buscas em `POST /cars/search`, por usuário)
- Drizzle ORM
- PostgreSQL (`pg`)
- Zod para validação de payloads
- OpenAI SDK (`openai`) para o agente de busca
- dotenv para carregamento de variáveis de ambiente
- `tsx` para execução em desenvolvimento

## 3. Estrutura do projeto

```
backend/
  package.json
  tsconfig.json
  drizzle.config.ts
  .env.example          # modelo versionado, sem segredos
  .env                  # local, ignorado pelo Git
  tests/
    catalog.test.ts
    cors.test.ts
    ai-search.test.ts
  src/
    app.ts
    server.ts
    config/
      cors.ts
      env.ts
    db/
      client.ts
      migrations/
      schema/
        cars.ts
        index.ts
    modules/
      auth/           # login, logout, /auth/me, sessão, senha e CLI de usuários
      cars/
        cars.repository.ts
        cars.routes.ts
        cars.schema.ts
        cars-create.controller.ts
        cars-write.routes.ts
        catalog/        # GET /cars e GET /cars/:id
        search/
          ai-search.controller.ts
          ai-search.routes.ts
          search-interpreter.ts
```

### 3.1 `package.json`

Define dependências e scripts:

- `dev`: servidor em modo watch via `tsx watch src/server.ts`
- `build`: compilação TypeScript com `tsc -p tsconfig.json`
- `typecheck`: verificação de tipos sem emissão
- `test`: testes de catálogo, busca IA, CORS, autenticação, cadastro, senha e CLI com `node:test`, sem banco nem OpenAI
- `user:create`: CLI para criar usuário ou redefinir senha (seção 10.1)

### 3.2 `tsconfig.json`

Configuração do compilador TypeScript para saída compatível com ESM.

## 4. Arquitetura do backend

- `src/server.ts`: inicializa o app com `buildApp()` e faz `listen` em `env.PORT` no host `0.0.0.0`.
- `src/app.ts`: instancia Fastify com logger, registra CORS, `GET /health` e as rotas do módulo `cars`.
- `src/config/env.ts`: valida variáveis de ambiente com Zod.
- `src/config/cors.ts`: valida `CORS_ORIGINS` e monta as opções do `@fastify/cors`.
- `src/db/client.ts`: pool PostgreSQL + Drizzle.
- `src/modules/cars`: domínio de carros (CRUD parcial + busca).

### Camadas do módulo `cars`

- `search/ai-search.routes.ts`: registra `POST /cars/search`, com sessão obrigatória, limite de 10 buscas por minuto por usuário e interpretador, catálogo e guard injetados.
- `search/ai-search.controller.ts`: valida o corpo, chama o interpretador, consulta `GET /cars` pelo mesmo caminho do catálogo e mapeia erros para 400/401/422/429/503/500.
- `search/search-interpreter.ts`: `SearchInterpreter`/`OpenAISearchInterpreter`, com a tool `buscar_carros` (`strict`), validação dos argumentos e conversão em filtros.
- `cars-write.routes.ts` e `cars-create.controller.ts`: `POST /cars`, com sessão obrigatória, validação com Zod e respostas 400/500 padronizadas.
- `catalog/`: `GET /cars` e `GET /cars/:id`, com schema de query, serviço e paginação.
- `cars.repository.ts`: inserção e consulta paginada do catálogo, com filtros construídos pelo query builder do catálogo.
- `cars.schema.ts`: esquemas Zod de criação.

## 5. Fluxo de requisição `POST /cars`

1. Cliente envia `POST /cars` com JSON no corpo e cookie `sid`.
2. Verificação de `Origin`: origem presente e fora de `CORS_ORIGINS` → `403`. Sem `Origin` (ex.: curl), segue.
3. Sem sessão válida → `401`.
4. `createCarSchema.parse(request.body)`; falha → `400` com `{ "error": "Validation error", "details": [{ "path", "message" }] }`.
5. Inserção no repositório; `price` convertido para string (tipo `numeric` no PostgreSQL).
6. Resposta `201 Created` com o registro retornado por `returning()`.

Falha inesperada: `500 { "error": "Failed to create car" }`, sem mensagem interna.

## 6. Fluxo de requisição `POST /cars/search`

1. Corpo: `{ "search": "<texto>", "pageSize"?: 1..100 }`. `search` tem `trim` e 1 a 300 caracteres; `pageSize` padrão 12. Texto inválido ou vazio → `400 INVALID_REQUEST`, sem chamar a OpenAI.
2. Limite de 10 buscas por minuto por usuário (`request.user.id`), em memória. Excedido → `429 RATE_LIMITED`, sem chamar a OpenAI.
3. `OpenAISearchInterpreter` chama a OpenAI uma vez (timeout de 10 s, 1 nova tentativa, `temperature: 0`, `tool_choice: "required"`) com a tool `buscar_carros` (`strict: true`) e o modelo de `OPENAI_MODEL`.
4. Os argumentos são validados por um Zod `strictObject` e revalidados pelo schema de `GET /cars` (`catalogQuerySchema`). Sem tool call, JSON inválido ou argumentos inválidos → `422 SEARCH_NOT_UNDERSTOOD`, sem consulta ao banco.
5. Os argumentos viram filtros do catálogo (`brand`, `model`, `version`, `yearMin`, `yearMax`, `mileageMin`, `mileageMax`, `priceMin`, `priceMax`). `ano` vira `yearMin = yearMax`.
6. A rota consulta a primeira página pelo mesmo caminho do `GET /cars` (`CatalogService.listCars`).
7. Resposta `200 OK` com `{ items, pagination, filters, ignored }`. `filters` usa os nomes da query de `GET /cars`; `ignored` lista até 5 critérios reconhecidos mas não filtráveis (ex.: cor), de até 60 caracteres cada.

Exige sessão: sem cookie válido, `401`. Falha do provedor (timeout, rede, qualquer erro da API OpenAI) → `503 AI_UNAVAILABLE`. Falha do banco → `500 INTERNAL_ERROR`. Erros usam `{ "error": { "code", "message" } }`, sem mensagens do provedor ou do banco.

Cada busca gera um log `Busca IA` com `userId`, `durationMs`, `promptTokens`, `completionTokens`, `outcome` (`ok`, `not_understood`, `unavailable`, `error`) e, em falha do provedor, `provider` com status e código. O texto da busca e os valores dos filtros não são logados.

## 7. Validação de dados

### Criação (`createCarSchema`)

Todos os textos recebem `trim`.

- `brand`: obrigatório, até 80 caracteres
- `model`: obrigatório, até 120 caracteres
- `version`: opcional, até 120 caracteres
- `fuel`, `transmission`: obrigatórios, até 30 caracteres
- `year`: inteiro entre 1886 e o ano atual + 1
- `price`: inteiro positivo até 9.999.999.999 (limite de `numeric(12,2)`)
- `mileage`: inteiro de 0 a 2.000.000
- `imageUrl`: opcional, até 2048 caracteres, somente `http` ou `https`

### Listagem (`GET /cars`, `catalogQuerySchema`)

- `yearMin`, `yearMax`: inteiros de 1886 até o ano atual + 1.
- `mileageMin`, `mileageMax`: inteiros de 0 a 2.000.000.
- `priceMin`, `priceMax`: inteiros em reais, de 1 a 9.999.999.999.
- Mínimo menor ou igual ao máximo em cada par. Limites inclusivos; `mileage` nulo fica de fora do filtro de quilometragem. Valor inválido ou chave desconhecida → 400.

### Busca (`POST /cars/search`)

- `search`: string com `trim`, de 1 a 300 caracteres.
- `pageSize`: inteiro de 1 a 100, padrão 12.

### Argumentos da tool (`buscar_carros`)

Zod `strictObject` em `search-interpreter.ts`: `marca`, `nome`, `versao`, `ano`, `ano_min`, `ano_max`, `km_min`, `km_max`, `preco_min`, `preco_max` e `ignorados`. `ano` não pode vir junto com `ano_min` ou `ano_max`. No modo `strict`, todos os campos vêm em `required` e aceitam `null`.

## 8. Persistência e banco de dados

### 8.1 Drizzle ORM

Cliente em `src/db/client.ts` com `Pool` do `pg` e `drizzle({ client: pool, schema })`.

### 8.2 Tabela `cars` (`src/db/schema/cars.ts`)

- `id`: UUID, PK, default random
- `brand`, `model`, `version`, `imageUrl`: varchar
- `year`: integer not null
- `price`: numeric(12, 2) not null
- `fuel`, `transmission`: varchar (nullable no schema Drizzle atual)
- `mileage`: integer nullable
- `createdAt`, `updatedAt`: timestamptz com default `now()`

### 8.3 Migrations

A pasta `src/db/migrations/` versiona alterações de schema (detalhes dependem do histórico gerado pelo Drizzle Kit).

## 9. Configuração de ambiente

`src/config/env.ts` exige (com defaults onde indicado):

| Variável         | Descrição                                      |
|-----------------|-------------------------------------------------|
| `NODE_ENV`      | `development` \| `production` \| `test` (default: development) |
| `PORT`          | Porta HTTP (default: `3333`)                   |
| `DATABASE_URL`  | Connection string PostgreSQL                   |
| `OPENAI_API_KEY`| Chave da API OpenAI                            |
| `OPENAI_MODEL`  | Identificador do modelo (ex.: compatível com chat completions + tools) |
| `CORS_ORIGINS`  | Origens permitidas, separadas por vírgula, sem caminho ou barra final. Vazio fora de produção usa `http://localhost:5173`; obrigatório em `production` |
| `SESSION_TTL_HOURS` | Duração absoluta da sessão, inteiro de 1 a 720; padrão `8` |

O script `user:create` precisa só de `DATABASE_URL`.

Copie `.env.example` para `.env` e preencha os valores, ou defina-os no ambiente.

## 10. Rotas do backend

| Método | Rota            | Auth   | Descrição |
|--------|-----------------|--------|-----------|
| `GET`  | `/health`       | —      | Liveness: retorna `{ "status": "ok" }`; não verifica banco nem OpenAI. |
| `GET`  | `/cars`         | —      | Listagem paginada com filtros de marca, modelo, versão, faixas de ano, quilometragem e preço. |
| `GET`  | `/cars/:id`     | —      | Detalhes de um veículo (400/404/500 com erros seguros). |
| `POST` | `/cars`         | cookie | Cria um carro; corpo conforme `createCarSchema`. |
| `POST` | `/cars/search`  | cookie | Interpreta texto livre com a OpenAI e devolve a primeira página do catálogo, com `filters` e `ignored`. 10 por minuto por usuário. |
| `POST` | `/auth/login`   | —      | Recebe `{ "email", "password" }`; `200 { "user": { id, email, name } }` e cookie `sid`. |
| `POST` | `/auth/logout`  | opcional | `204`, idempotente; apaga a sessão e o cookie. |
| `GET`  | `/auth/me`      | cookie | `200 { "user": { id, email, name } }`; `401` sem sessão válida. |

Todas as rotas são registradas no prefixo raiz da aplicação Fastify (sem prefixo `/api` adicional).

### 10.1 Autenticação e CLI

- Sessão própria: tabelas `users` e `sessions` (`src/db/schema/`). O token tem 32 bytes aleatórios; o banco guarda só o SHA-256. Senha com `scrypt` nativo.
- Cookie `sid`: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` em `NODE_ENV=production`, `Max-Age` igual a `SESSION_TTL_HOURS`. A duração é absoluta, sem renovação.
- Login inválido, e-mail inexistente ou usuário desativado (`disabled_at`) retornam o mesmo `401 { "error": "Invalid credentials" }`.
- `POST /auth/login` tem limite de 5 tentativas por minuto por IP (`429`), em memória. Não há `trustProxy` configurado.
- `POST /cars/search` tem limite de 10 buscas por minuto por usuário autenticado (`429`), em memória. Respostas `401` não consomem cota.
- `POST /auth/logout` e `POST /cars` recusam com `403` uma `Origin` presente e fora de `CORS_ORIGINS`.
- Não há cadastro público nem papéis: todo usuário autenticado pode cadastrar veículos.
- Usuários são criados e redefinidos pelo CLI (`src/scripts/user.ts`, `src/modules/auth/user-admin.ts`):

```sh
npm run user:create -- --email ana@empresa.com --name "Ana"
npm run user:create -- --email ana@empresa.com --reset-password
```

A senha é lida do terminal sem eco, ou da primeira linha do `stdin` quando não há TTY. Nunca é aceita por argumento. Mínimo de 12 caracteres, com confirmação. E-mail duplicado encerra com erro sem alterar nada. `--reset-password` troca a senha e apaga as sessões do usuário. O script não imprime hash nem senha. A migration `0001` precisa estar aplicada no banco alvo antes do uso.

## 11. Observações gerais

- CORS aceita somente as origens de `CORS_ORIGINS`; outras origens não recebem cabeçalhos CORS. CORS não substitui autenticação.
- A busca depende de `OPENAI_API_KEY` e `OPENAI_MODEL` válidos em tempo de execução.
- Arquitetura em camadas mantém testabilidade; a interpretação de IA está isolada em `search/` e a busca usa a mesma consulta de `GET /cars`.
- Tratamento de erros no controller segue o padrão try/catch com distinção básica de Zod vs erro genérico.

## 12. Possíveis melhorias

- Endpoints de edição e exclusão: `PUT/PATCH /cars/:id`, `DELETE /cars/:id`.
- Testes de integração (repositório em PostgreSQL isolado, agente com mocks, regressão dos POST).
- Plugin centralizado de erros Fastify e tipagem mais estrita das respostas de erro.
- Observabilidade (métricas/tracing) nas chamadas à OpenAI e orçamento de custo com bloqueio (fora do escopo da spec 004).

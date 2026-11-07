# Projeto Backend - Cars

## 1. Visão geral

Este backend é uma API REST em TypeScript usando Fastify, Drizzle ORM em PostgreSQL e Zod para validação. O módulo de carros oferece cadastro de veículos e busca semântica assistida por modelo de linguagem (OpenAI): o cliente envia uma pergunta em linguagem natural e o servidor traduz em filtros sobre o catálogo e consulta o banco.

## 2. Tecnologias principais

- Node.js + TypeScript (ESM)
- Fastify
- `@fastify/cors` (somente as origens listadas em `CORS_ORIGINS`)
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
      cars/
        cars.controller.ts
        cars.repository.ts
        cars.routes.ts
        cars.schema.ts
        cars.service.ts
        catalog/        # GET /cars e GET /cars/:id
        search/
          ai-search-agent.service.ts
          search-query-builder.ts
```

### 3.1 `package.json`

Define dependências e scripts:

- `dev`: servidor em modo watch via `tsx watch src/server.ts`
- `build`: compilação TypeScript com `tsc -p tsconfig.json`
- `typecheck`: verificação de tipos sem emissão
- `test`: testes do catálogo e do CORS com `node:test`, sem banco nem OpenAI

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

- `cars.routes.ts`: registra `POST /cars` e `POST /cars/search`.
- `cars.controller.ts`: valida corpo com Zod, chama o service, responde com códigos HTTP adequados.
- `cars.service.ts`: criação no repositório; busca delegada ao `AiSearchAgentService`.
- `cars.repository.ts`: inserção e consulta com filtros construídos pelo query builder.
- `cars.schema.ts`: esquemas Zod de criação, corpo da busca e tipo de filtros internos.
- `search/ai-search-agent.service.ts`: uma chamada à API OpenAI com tool obrigatória `buscar_carros`, interpreta argumentos e chama o repositório.
- `search/search-query-builder.ts`: monta condições Drizzle (`ilike`) para marca, modelo e versão.

## 5. Fluxo de requisição `POST /cars`

1. Cliente envia `POST /cars` com JSON no corpo.
2. `createCarSchema.parse(request.body)` no controller.
3. `CarsService.createCar` → `CarsRepository.createCar`.
4. Inserção na tabela `cars`; `price` convertido para string (tipo `numeric` no PostgreSQL).
5. Resposta `201 Created` com o primeiro registro retornado por `returning()`.

Erros de validação Zod: `400` com `error` e `details`. Outros erros: `500` com mensagem contextualizada quando possível.

## 6. Fluxo de requisição `POST /cars/search`

1. Corpo esperado: `{ "search": "<texto em linguagem natural>" }` (validado por `searchRequestSchema`).
2. `CarsService.searchCars` chama `AiSearchAgentService.run(search)`.
3. O serviço usa o modelo configurado em `OPENAI_MODEL`, com mensagem de sistema em português e **tool choice obrigatória** para a função `buscar_carros`.
4. Os argumentos da tool (JSON) são validados com Zod (`marca`, `nome`, `versao` opcionais) e mapeados para filtros internos: `brand`, `model`, `version`.
5. `CarsRepository.searchCars` usa `buildSearchQuery`: para cada filtro preenchido, aplica `ILIKE` com `%valor%` sobre as colunas correspondentes; se não houver nenhum filtro, retorna **todos** os carros.
6. Resposta `200 OK` com array de veículos.

Erros de validação do corpo da requisição: `400`. Falhas na cadeia (OpenAI, banco): `500`.

**Nota de implementação:** a descrição da tool no OpenAI menciona também ano e quilometragem; o esquema de argumentos aceito e o query builder atuais consideram apenas fabricante (`marca`), modelo (`nome`) e versão (`versao`). Critérios de ano e km exigiriam estender `filtersSchema`, o parser pós-tool e `buildSearchQuery`.

## 7. Validação de dados

### Criação (`createCarSchema`)

- `brand`, `model`: string obrigatória (mínimo 1 caractere)
- `version`: string opcional (mínimo 1 se enviada)
- `year`: inteiro ≥ 1886
- `price`: inteiro positivo
- `fuel`, `transmission`: string obrigatória (mínimo 1)
- `mileage`: inteiro ≥ 0
- `imageUrl`: URL válida opcional

### Busca (`searchRequestSchema`)

- `search`: string obrigatória, mínimo 1 caractere (pergunta ou comando em texto livre)

### Filtros internos (`filtersSchema` / `SearchFilters`)

Usados após interpretação pela IA (e podem ser reutilizados em evoluções da API):

- `brand`, `model`, `version`: strings opcionais com regras de tamanho definidas no Zod.

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

Copie `.env.example` para `.env` e preencha os valores, ou defina-os no ambiente.

## 10. Rotas públicas do backend

| Método | Rota            | Descrição |
|--------|-----------------|-----------|
| `GET`  | `/health`       | Liveness: retorna `{ "status": "ok" }`; não verifica banco nem OpenAI. |
| `GET`  | `/cars`         | Listagem paginada com filtros de marca, modelo e versão. |
| `GET`  | `/cars/:id`     | Detalhes de um veículo (400/404/500 com erros seguros). |
| `POST` | `/cars`         | Cria um carro; corpo conforme `createCarSchema`. |
| `POST` | `/cars/search`  | Busca no catálogo a partir de texto livre; usa OpenAI + consulta SQL com filtros opcionais. |

Todas as rotas de carros são registradas no prefixo raiz da aplicação Fastify (sem prefixo `/api` adicional).

## 11. Observações gerais

- CORS aceita somente as origens de `CORS_ORIGINS`; outras origens não recebem cabeçalhos CORS. CORS não substitui autenticação.
- A busca depende de `OPENAI_API_KEY` e `OPENAI_MODEL` válidos em tempo de execução.
- Arquitetura em camadas mantém testabilidade; o agente de IA está isolado em `search/`.
- Tratamento de erros no controller segue o padrão try/catch com distinção básica de Zod vs erro genérico.

## 12. Possíveis melhorias

- Alinhar capacidades da tool OpenAI com o query builder (ano, faixa de ano, quilometragem) e estender `SearchFilters`.
- Endpoints de edição e exclusão: `PUT/PATCH /cars/:id`, `DELETE /cars/:id`.
- Testes de integração (repositório em PostgreSQL isolado, agente com mocks, regressão dos POST).
- Plugin centralizado de erros Fastify e tipagem mais estrita das respostas de erro.
- Paginação na busca por IA.
- Rate limiting e observabilidade (métricas/tracing) nas chamadas à OpenAI.

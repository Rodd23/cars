# 004 — Busca por IA confiável

Status: implementada em 07/11/2026; AC16 não executado (sem autorização). A aprovação autorizou código, testes e documentação em `backend/` e `frontend/`. Não autorizou chamadas reais à OpenAI em testes, commits, push ou deploy. Uma verificação manual com chamada real só acontece se o usuário a autorizar explicitamente.

## Problema e objetivo

`POST /cars/search` interpreta texto livre com a OpenAI, mas na prática:

- ignora ano e quilometragem, que o próprio prompt pede;
- devolve o catálogo inteiro quando a IA falha;
- não pagina os resultados;
- expõe mensagens internas;
- não tem controle de custo nem de tempo de resposta.

A interface também não usa essa rota.

Objetivo: a busca vira um **interpretador**. A IA traduz o texto em filtros do catálogo validados, e a consulta reaproveita a listagem `GET /cars`, que já é paginada e escapa curingas. Falhas viram erros explícitos e o custo fica limitado. O catálogo web ganha um campo de busca em linguagem natural.

## Comportamento atual e evidências

- [ai-search-agent.service.ts](../../../backend/src/modules/cars/search/ai-search-agent.service.ts):
  - O prompt e a descrição da tool mencionam `ano`, `ano_min`, `ano_max`, `km_min` e `km_max`.
  - O schema JSON da tool declara só `marca`, `nome` e `versao`, com `additionalProperties: false`.
  - `toolArgsSchema` lê só esses três campos.
  - Falta de tool call, JSON inválido ou argumentos inválidos resultam em `filters = {}`.
- [cars.repository.ts](../../../backend/src/modules/cars/cars.repository.ts): `searchCars` não usa `filters` vazio e devolve **todas** as linhas, sem limite. [search-query-builder.ts](../../../backend/src/modules/cars/search/search-query-builder.ts) monta `ILIKE '%valor%'` **sem escapar** `%` e `_`.
- O [catalog-query-builder.ts](../../../backend/src/modules/cars/catalog/catalog-query-builder.ts) já escapa curingas. O `GET /cars` pagina com `{ items, pagination }` e devolve erros seguros no formato `{ error: { code, message } }`.
- [cars.controller.ts](../../../backend/src/modules/cars/cars.controller.ts): o 400 usa `(error as any).errors`, que sai vazio no Zod 4 (confirmado na spec 003). O 500 inclui `message` vinda da OpenAI ou do banco.
- O cliente `OpenAI` é criado sem `timeout` nem `maxRetries` explícitos, então valem os padrões do SDK. Não há limite de tamanho do texto nem de chamadas por usuário. Desde a spec 003, a rota exige sessão.
- O frontend não chama `POST /cars/search` ([client.ts](../../../frontend/src/api/client.ts)).

## Escopo e fora do escopo

**Inclui:**
- novos filtros de ano, quilometragem e preço em `GET /cars` (D1);
- novo contrato de `POST /cars/search`: interpretação, primeira página e filtros devolvidos;
- tool da OpenAI com os campos suportados e lista de critérios ignorados;
- erros explícitos em vez de catálogo inteiro;
- timeout, limite de texto e rate limit por usuário;
- log de uso de tokens sem o texto;
- campo de busca em linguagem natural no catálogo web;
- testes com interpretador simulado e documentação.

**Fora do escopo:** busca vetorial ou embeddings; filtros de combustível, câmbio e cor; ordenação por relevância ou preço; histórico de buscas; cache de interpretações; orçamento mensal com bloqueio; troca de provedor; tornar a configuração da OpenAI opcional na inicialização (continua obrigatória).

## Comportamento proposto e cenários

1. Um usuário logado digita “BMW de 2018 a 2020 com até 50 mil km”.
2. O backend chama a OpenAI uma vez e recebe `{ marca: "BMW", ano_min: 2018, ano_max: 2020, km_max: 50000 }`.
3. Os argumentos são validados e convertidos para os filtros do catálogo (`brand`, `yearMin`, `yearMax`, `mileageMax`).
4. O backend consulta a primeira página pelo mesmo caminho do `GET /cars` e responde com `items`, `pagination`, os `filters` aplicados e os `ignored`, critérios que a IA reconheceu mas o catálogo não filtra, como “cor preta”.
5. O frontend navega para `/cars?brand=BMW&yearMin=2018&yearMax=2020&mileageMax=50000`. A partir daí, tudo é catálogo comum: chips de filtro, paginação via `GET`, voltar dos detalhes. **Mudar de página não chama a IA de novo.**

| Cenário | Resultado |
|---|---|
| Pedido genérico (“mostre tudo”), tool com `{}` | 200, primeira página sem filtros. Fica paginado, então não traz o catálogo inteiro de uma vez |
| Só critérios não suportados (“carros vermelhos”) | 200 com `filters: {}` e `ignored: ["cor vermelha"]`. A interface avisa que o critério foi ignorado |
| Sem tool call, JSON inválido ou argumentos inválidos (tipo errado, `ano` junto com `ano_min`, mínimo maior que máximo, fora da faixa) | **422** `SEARCH_NOT_UNDERSTOOD` e nenhuma consulta ao banco |
| Timeout, erro de rede ou 5xx da OpenAI | **503** `AI_UNAVAILABLE` |
| 401 ou 429 da OpenAI (credencial ou cota) | **503** `AI_UNAVAILABLE`, registrado no log com o código do provedor e sem a mensagem bruta |
| Texto vazio ou com mais de 300 caracteres | **400** `INVALID_REQUEST` e nenhuma chamada à OpenAI |
| Limite por usuário excedido | **429** `RATE_LIMITED` e nenhuma chamada à OpenAI |
| Falha do banco | **500** `INTERNAL_ERROR` |
| Curinga no valor (`%`, `_`) | Tratado como literal, pelo builder do catálogo |

## Contratos da API e dados

### `GET /cars`: filtros novos, aditivos e compatíveis (D1)

| Parâmetro | Regra |
|---|---|
| `yearMin`, `yearMax` | Inteiro de 1886 até o ano atual + 1. `yearMin` não pode passar de `yearMax`. Ano exato é `yearMin = yearMax` |
| `mileageMin`, `mileageMax` | Inteiro de 0 a 2.000.000, com mínimo menor ou igual ao máximo |
| `priceMin`, `priceMax` | Inteiro em reais, de 1 a 9.999.999.999, com mínimo menor ou igual ao máximo |

- Os limites são inclusivos (`>=` e `<=`). Veículos com `mileage` nulo ficam de fora quando há filtro de quilometragem.
- Valor inválido gera o 400 `INVALID_REQUEST` atual. Os parâmetros, a ordenação e a paginação que já existem não mudam.
- O `strictObject` passa a aceitar as novas chaves; uma chave desconhecida continua gerando 400.

### `POST /cars/search`: contrato novo (incompatível; a rota não tem clientes na interface)

Requisição: `{ "search": string, "pageSize"?: number }`.
- `search`: `trim`, de 1 a 300 caracteres.
- `pageSize`: de 1 a 100, padrão 12.
- A página é sempre a 1. As seguintes vêm pelo `GET /cars` com `filters`.

Resposta 200:

```json
{
  "items": [ /* Car, mesmo formato do GET /cars */ ],
  "pagination": { "page": 1, "pageSize": 12, "totalItems": 3, "totalPages": 1 },
  "filters": { "brand": "BMW", "yearMin": 2018, "yearMax": 2020, "mileageMax": 50000 },
  "ignored": ["cor preta"]
}
```

- `filters` usa os mesmos nomes da query de `GET /cars` e omite os campos ausentes.
- `ignored` é um array de textos curtos, com até 5 itens de até 60 caracteres cada. Pode vir vazio. Entradas fora desses limites são descartadas, sem gerar 422.

Erros, no formato do catálogo `{ "error": { "code", "message" } }`, com mensagens em português:
- `400 INVALID_REQUEST`
- `401` (sessão, já existente)
- `422 SEARCH_NOT_UNDERSTOOD` (“Não entendi a busca. Tente citar marca, modelo, ano ou quilometragem.”)
- `429 RATE_LIMITED`
- `503 AI_UNAVAILABLE` (“A busca inteligente está indisponível. Use os filtros.”)
- `500 INTERNAL_ERROR`

Nenhuma mensagem do provedor ou do banco chega ao cliente.

### Tool `buscar_carros`

O schema JSON passa a declarar todos os campos com tipos, e a validação usa um Zod `strictObject`:

| Campo | Tipo | Mapeia para |
|---|---|---|
| `marca`, `nome`, `versao` | string (até 80, 120 e 120) | `brand`, `model`, `version` |
| `ano` | inteiro | `yearMin = yearMax = ano` (proibido junto com `ano_min` ou `ano_max`) |
| `ano_min`, `ano_max` | inteiro | `yearMin`, `yearMax` |
| `km_min`, `km_max` | inteiro | `mileageMin`, `mileageMax` |
| `preco_min`, `preco_max` | inteiro em reais | `priceMin`, `priceMax` (D1) |
| `ignorados` | array de strings | `ignored` |

- O prompt de sistema é reescrito para listar só esses campos e instruir: “critérios que não cabem nesses campos vão em `ignorados`; nunca invente valores”.
- Mantém `temperature: 0` e `tool_choice: "required"`. Com `strict: true` (structured outputs), o schema é imposto pelo provedor. Nesse modo, todos os campos ficam em `required`, e cada um aceita `null` (`["integer", "null"]`); a conversão trata `null` como ausente.
- O resultado convertido é validado de novo com o schema de `GET /cars`, que é a fonte única dos limites. Qualquer falha nessa validação gera 422.

### Arquitetura

- `AiSearchAgentService` passa a ser um `SearchInterpreter` com `interpret(text): Promise<{ filters, ignored }>`, sem acesso ao banco.
- A rota usa o interpretador e depois o `CatalogService.listCars` existente. Os dois são injetados no plugin, para testar sem OpenAI.
- `searchCars` e `search-query-builder.ts` saem do repositório e do módulo. `buildCatalogWhere` ganha as faixas.
- O cliente OpenAI recebe `timeout: 10_000` e `maxRetries: 1` (D3).

### Custo e observabilidade

- **Rate limit:** 10 buscas por minuto por usuário autenticado, com `@fastify/rate-limit` (já instalado) e `keyGenerator` pelo `request.user.id` (D2).
- **Log por busca:** `userId`, `durationMs`, `usage.prompt_tokens`, `usage.completion_tokens`, `outcome` (`ok`, `not_understood`, `unavailable`) e os **nomes** dos filtros aplicados. O **texto da busca e os valores não são logados** (D4).
- Não há bloqueio por orçamento. O custo diário pode ser estimado a partir dos logs, e um bloqueio fica para a etapa de operação.

### Dados

Sem mudança de schema nem migration. Hipótese a confirmar no plano: os filtros de faixa usam `year`, `mileage` e `price` sem índices novos, o que é aceitável para o volume atual (2 linhas no banco atual).

## Interface

- **Campo de busca:** na página do catálogo, acima dos filtros, aparece **só para usuários logados**, porque a rota exige sessão. Tem o rótulo “Busca inteligente”, um placeholder de exemplo (“BMW até 50 mil km, de 2018 a 2020”), limite de 300 caracteres e o botão “Buscar”. Durante o envio, mostra “Interpretando…” e bloqueia novo envio.
- **Sucesso:** a página navega para `/cars?<filters>`, que a URL e os filtros já existentes passam a refletir. Um aviso (`role="status"`) mostra “Entendi: BMW, 2018–2020, até 50.000 km” e, se houver `ignored`, “Ignorado: cor preta”.
- **Filtros novos:** o formulário de filtros ganha campos de ano (mín./máx.), quilometragem máxima e preço máximo (D1), com validação Zod espelhando o backend. Os chips de filtros ativos incluem as faixas.
- **Erros:** 422, 503 e 429 aparecem em `role="alert"` junto ao campo, com o texto do backend. Os filtros e resultados atuais continuam na tela. Um 401 marca a sessão como expirada, como no formulário de cadastro.
- **Visual e acessibilidade:** tokens do [DESIGN.md](../../../frontend/DESIGN.md), funcionamento em 360px, alvos de pelo menos 44px e foco devolvido ao campo após um erro.

## Segurança e serviços externos

- **Dados enviados à OpenAI:** só o texto da busca, sem dados do usuário nem do catálogo.
- **Custo:** uma chamada por busca, com no máximo 1 nova tentativa. O texto de 300 caracteres limita os tokens de entrada, e o rate limit por usuário limita o volume.
- **Indisponibilidade:** 503 e a interface sugere os filtros manuais. Os filtros tradicionais não dependem da OpenAI.
- **Prompt injection:** o texto do usuário só pode produzir argumentos validados por um schema estrito com faixas. O pior caso é um filtro inútil ou um 422, nunca um SQL arbitrário ou o catálogo inteiro sem paginação.
- **Testes:** usam um interpretador simulado e um cliente OpenAI simulado. Nenhuma chamada real.

## Critérios de aceite

| # | Critério | Validação |
|---|---|---|
| AC1 | `GET /cars` aceita as faixas de ano, km e preço com limites inclusivos. Mínimo maior que máximo, valor fora da faixa ou não inteiro geram 400. Os testes antigos continuam passando | teste backend + SQL compilado |
| AC2 | Filtro de km exclui `mileage` nulo | teste do builder (SQL) |
| AC3 | Tool com `ano`, faixas, km, preço e `ignorados` vira os `filters` esperados, e `ano` vira `yearMin = yearMax` | teste unitário do interpretador com cliente simulado |
| AC4 | Sem tool call, JSON inválido, `ano` com `ano_min`, mínimo maior que máximo ou fora da faixa → 422 e o catálogo **não** é consultado | teste de rota |
| AC5 | `{}` → 200 com a primeira página, sem filtros e paginada | teste de rota |
| AC6 | Timeout, 5xx, 401 ou 429 do provedor → 503, sem mensagem do provedor no corpo | teste com cliente simulado |
| AC7 | Texto vazio ou com mais de 300 caracteres → 400, sem chamar o interpretador | teste de rota |
| AC8 | A 11ª busca no minuto, do mesmo usuário, gera 429 sem chamar o interpretador; outro usuário não é afetado | teste de rota (limite injetado) |
| AC9 | Resposta 200 tem `items`, `pagination`, `filters` e `ignored`; `ignored` acima do limite é truncado ou descartado | teste de rota |
| AC10 | `%` e `_` vindos da IA são literais | teste do SQL compilado |
| AC11 | O log de uma busca contém tokens, duração e resultado, e **não** contém o texto da busca | teste capturando o logger |
| AC12 | Frontend: campo visível só com sessão; sucesso navega para `/cars?…` com o aviso “Entendi” e o “Ignorado”; paginar depois não chama `POST` | teste frontend (fetch mockado) |
| AC13 | Frontend: 422, 503 e 429 mostram alerta e preservam a tela; 401 expira a sessão | teste frontend |
| AC14 | Frontend: filtros de ano, km e preço refletidos na URL e nos chips; valores inválidos bloqueados no cliente | teste frontend |
| AC15 | Typecheck, testes e build de backend e frontend passam | validador |
| AC16 (opcional, manual) | Três buscas reais (“tem bmw?”, “gol 1.4 até 80 mil km”, “carro azul”) produzem os filtros esperados | **só com autorização explícita** para chamada paga |

## Plano e validação

1. **Backend: catálogo.** `catalogQuerySchema` com as faixas e os refinamentos; `buildCatalogWhere` com `gte`/`lte`; tipos do frontend (`CarListQuery`).
2. **Backend: interpretador.** `search/search-interpreter.ts` (tool, prompt, Zod estrito, conversão, erros tipados `NotUnderstood` e `Unavailable`, cliente OpenAI injetável com timeout e retries); remoção de `searchCars` do repositório e de `search-query-builder.ts`.
3. **Backend: rota.** Plugin `aiSearchRoutes` com interpretador, catálogo e guard injetados; schema da requisição; mapeamento de erros; rate limit por usuário; log de uso.
4. **Backend: testes.** `tests/ai-search.test.ts` e casos novos em `catalog.test.ts`.
5. **Frontend.** `searchCars` no cliente; filtros novos em `CatalogFilters` e nos chips; componente `SmartSearch` no catálogo; testes.
6. **Documentação.** READMEs, `architecture.md` (remover as limitações corrigidas), `development.md`, `roadmap.md` (etapa 6) e `AGENTS.md` (pontos de atenção da busca).

Distribuição: o **executor** cuida do backend (1–4) e do frontend (5) em paralelo, porque o contrato está fixado aqui. Depois vêm o **validador** e o **documentador**. A revisão do interpretador usa `review-sensitive-changes`. Os comandos de validação não tocam banco nem OpenAI.

## Decisões pendentes e aprovação

| # | Pergunta | Recomendação |
|---|---|---|
| D1 | Incluir filtro de **preço** (`preco_min`/`preco_max` na IA, `priceMin`/`priceMax` no GET) além de ano e km? | **Sim.** É um pedido comum (“até 60 mil”) e custa pouco no mesmo builder |
| D2 | Rate limit da busca | **10 por minuto por usuário**, em memória |
| D3 | Timeout e novas tentativas da OpenAI | **10 s e 1 nova tentativa** |
| D4 | Logar o texto da busca? | **Não.** Só métricas e nomes dos filtros. Logar o texto ajuda a ajustar o prompt, mas guarda o que o usuário digitou |
| D5 | Incluir a interface (campo de busca e filtros novos) nesta entrega? | **Sim**, para entregar um fluxo de ponta a ponta. A alternativa é só o backend agora e a interface numa spec 005 |

Aprovação: o usuário aprovou em 07/11/2026, nesta conversa ("Aprovo"), com as recomendações acima. D1 sim (inclui filtro de preço); D2 10 por minuto por usuário; D3 10 s e 1 nova tentativa; D4 sem logar o texto; D5 interface incluída. Continuam sem autorização: AC16 (chamadas reais à OpenAI), commits, push e deploy.

## Evidências da entrega

Implementada em 07/11/2026.

Validação (validador, 07/11/2026; sem OpenAI real nem banco):
- Backend: typecheck ok; `npm test` 50/50 em 7 arquivos; build ok.
- Frontend: typecheck ok; `npm test` 60/60 em 6 arquivos; build ok.

Mapeamento dos critérios:

| AC | Situação | Evidência |
|---|---|---|
| AC1 | Coberto | `backend/tests/catalog.test.ts` (faixas, limites inclusivos, 400) |
| AC2 | Coberto | `backend/tests/catalog.test.ts` (SQL com `mileage` nulo excluído) |
| AC3 | Coberto | `backend/tests/ai-search.test.ts` (tool estrita, `ano` → `yearMin = yearMax`) |
| AC4 | Coberto | `backend/tests/ai-search.test.ts` (422 sem consulta ao catálogo) |
| AC5 | Coberto | `backend/tests/ai-search.test.ts` (`{}` → primeira página) |
| AC6 | Coberto | `backend/tests/ai-search.test.ts` (503 sem mensagem do provedor) |
| AC7 | Coberto | `backend/tests/ai-search.test.ts` (400 sem chamar o interpretador) |
| AC8 | Coberto | `backend/tests/ai-search.test.ts` (429 por usuário) |
| AC9 | Coberto | `backend/tests/ai-search.test.ts` (contrato 200; `ignored` truncado) |
| AC10 | Coberto | `backend/tests/catalog.test.ts` (`%` e `_` literais) |
| AC11 | Coberto | `backend/tests/ai-search.test.ts` (log sem texto nem valores) |
| AC12 | Coberto | `frontend/tests/smartsearch.test.tsx` (sessão, navegação, aviso, paginação sem `POST`) |
| AC13 | Coberto | `frontend/tests/smartsearch.test.tsx` (422/503/429 em alerta; 401 expira sessão) |
| AC14 | Coberto | `frontend/tests/smartsearch.test.tsx` (faixas na URL, chips e validação no cliente) |
| AC15 | Executado | validação acima |
| AC16 | Não executado | exige chamada real à OpenAI, sem autorização |

Não verificados: AC16; layout em 360 px em navegador real.

Desvios em relação ao texto aprovado:
- Qualquer `OpenAI.APIError` vira 503 `AI_UNAVAILABLE`, inclusive 400, 403 e 404 do provedor. A spec citava 401 e 429 (e timeout, erro de rede e 5xx).
- Risco: se `OPENAI_MODEL` não aceitar tools com `strict: true`, toda busca responde 503. Só o AC16 confirmaria o modelo configurado.

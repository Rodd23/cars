# 001 — Catálogo web interno

Status: contratos e comportamentos aprovados pelo usuário em 29/10/2026, pela mensagem “Aprovo”. Implementação em andamento: backend e interface de consulta implementados (frontend em 07/11/2026); pendências de AC10, AC11 e integração PostgreSQL isolada. Reorganização realizada.

## Problema e objetivo

Permitir que usuários internos consultem o catálogo de veículos em uma interface web, sem depender de chamadas manuais à API ou de interpretação por IA.

Decisões confirmadas pelo usuário nesta conversa:

- Uso interno; indexação em buscadores não é requisito desta entrega.
- Filtros tradicionais na primeira versão; integração da IA ao frontend fica para depois.
- Preço em BRL, em unidades de real: `50000` representa R$ 50.000,00.

## Comportamento atual e evidências

- [cars.routes.ts](../../../backend/src/modules/cars/cars.routes.ts) registra somente `POST /cars` e `POST /cars/search`.
- [cars.repository.ts](../../../backend/src/modules/cars/cars.repository.ts) insere veículos e consulta sem paginação; preço de entrada é convertido para string.
- [schema da tabela](../../../backend/src/db/schema/cars.ts) define preço `numeric(12,2)` e campos nullable.
- Na data desta spec não havia frontend (implementado depois, em 07/11/2026, ver evidências). Não há autenticação ou autorização implementadas. A configuração OpenAI é obrigatória na inicialização atual, embora o novo fluxo não deva chamá-la.

## Escopo proposto

- Novos endpoints de leitura `GET /cars` e `GET /cars/:id`.
- Tela de catálogo com filtros, paginação e acesso aos detalhes.
- Tela de detalhes com retorno ao catálogo preservando filtros e página.
- Estados de carregamento, catálogo vazio, nenhum resultado, indisponibilidade e veículo não encontrado.
- Testes dos novos contratos e do fluxo principal da interface.

Fora do escopo: cadastro na interface, edição, exclusão, login, permissões, busca por IA no frontend, uploads, favoritos, deploy, execução de migrations e reorganização do Git. Os endpoints POST existentes mantêm seus contratos e não serão usados pela nova interface.

Esta primeira implementação é para desenvolvimento e avaliação local. Uso interno não significa acesso protegido: disponibilização compartilhada depende de definir autenticação/autorização e exposição da API, inclusive das rotas de escrita existentes.

## Contratos propostos

### GET /cars

Parâmetros opcionais de query:

| Campo | Regra |
|---|---|
| `page` | Inteiro positivo; padrão 1 |
| `pageSize` | Inteiro de 1 a 100; padrão 12 |
| `brand` | Texto com trim, 1 a 80 caracteres quando informado |
| `model` | Texto com trim, 1 a 120 caracteres quando informado |
| `version` | Texto com trim, 1 a 120 caracteres quando informado |

O frontend omite filtros vazios. A API rejeita parâmetros conhecidos vazios/inválidos e parâmetros desconhecidos com `400`. Números de paginação devem representar inteiros válidos; não aceitar coerção de valores vazios, negativos ou fracionários.

Filtros textuais fazem correspondência parcial sem distinguir maiúsculas e minúsculas, combinados por `AND`. `%` e `_` são caracteres literais de busca, não curingas fornecidos pelo usuário; a implementação deve escapar os padrões sem concatenar SQL não parametrizado. Ausência de filtros lista o catálogo com paginação.

Ordenação fixa por `createdAt` decrescente e `id` decrescente como desempate. Navegação não garante um snapshot se houver alterações concorrentes no catálogo.

Resposta `200`:

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "pageSize": 12,
    "totalItems": 0,
    "totalPages": 0
  }
}
```

`totalItems` conta registros com os mesmos filtros, antes de paginar; `totalPages = ceil(totalItems / pageSize)`. Página além da última retorna array vazio com os metadados correspondentes, sem erro ou redirecionamento automático da API.

### GET /cars/:id

UUID válido e existente retorna `200` com um objeto de veículo. UUID inválido retorna `400`; inexistente retorna `404`.

### Representação do veículo nos novos endpoints

| Campo | Tipo JSON |
|---|---|
| `id` | string UUID |
| `brand`, `model` | string |
| `version` | string ou null |
| `year` | integer |
| `price` | string decimal com duas casas, em reais, por exemplo `"50000.00"` |
| `fuel`, `transmission` | string ou null |
| `mileage` | integer ou null, em quilômetros |
| `imageUrl` | string ou null |
| `createdAt`, `updatedAt` | string de data/hora ISO 8601 em UTC |

Preservar precisão decimal no contrato; não converter o preço para centavos nem alterar dados existentes. O frontend apresenta preço em `pt-BR`/BRL, inclusive casas decimais. Campos nullable devem ser tratados explicitamente, sem exibir `null` ou confundir quilometragem zero com ausência de informação.

### Erros dos novos endpoints

Formato comum: `{ "error": { "code": "INVALID_REQUEST", "message": "Mensagem segura" } }`.

| HTTP | Código | Cenário |
|---|---|---|
| 400 | `INVALID_REQUEST` | Query ou identificador inválido |
| 404 | `CAR_NOT_FOUND` | UUID válido sem veículo |
| 500 | `INTERNAL_ERROR` | Falha inesperada ou de banco |

Não retornar stack, SQL, conexão ou mensagem bruta do provedor. Logs devem preservar diagnóstico sem segredos. Não padronizar os endpoints antigos dentro desta entrega.

## Interface e cenários

- Rota `/cars`: filtros rotulados de marca, modelo e versão, botões Buscar e Limpar, cards e navegação Anterior/Próxima.
- Rota `/cars/:id`: detalhes e ação Voltar ao catálogo.
- A rota inicial leva ao catálogo. Query string preserva filtros e página, permite recarregar/compartilhar o estado e respeita o histórico do navegador.
- Buscar aplica filtros e reinicia na página 1; Limpar remove filtros e reinicia na página 1. Não fazer uma requisição a cada tecla.
- Cards mostram marca, modelo, versão quando disponível, ano, preço, quilometragem e imagem ou fallback. Detalhes incluem combustível e transmissão; timestamps não precisam aparecer na tela.
- Ausência de imagem ou falha no carregamento usa fallback local, sem serviço externo de placeholder. Imagem não representa ação de upload.
- Durante carregamento, indicar estado ocupado e impedir submissões duplicadas. Respostas antigas não podem sobrescrever resultados de uma navegação mais recente.
- Diferenciar catálogo vazio, nenhum resultado para os filtros e página fora do intervalo. Neste último caso, oferecer retorno à primeira página.
- Falha de API mostra mensagem compreensível e ação Tentar novamente preservando a consulta. `404` mostra veículo não encontrado e retorno ao catálogo.
- Layout utilizável em larguras de 360 px, 768 px e 1280 px, sem rolagem horizontal. Filtros e paginação operáveis por teclado, foco visível, títulos hierárquicos, labels e texto alternativo adequado nas imagens.

## Dados, segurança e integrações

Não se espera mudança de schema ou migration para os novos endpoints. Filtros e paginação devem ocorrer no banco, não após carregar toda a tabela. Índices adicionais só serão considerados com evidência e escopo próprio.

O novo fluxo não chama OpenAI. A dependência de variáveis OpenAI na inicialização atual permanece uma limitação conhecida; não preencher com credenciais reais para testes. Ajustar esse acoplamento exige decisão de escopo se for necessário para a implementação.

Credenciais PostgreSQL e OpenAI nunca entram no bundle frontend. A URL da API é configuração pública; CORS deve ser definido para a origem de desenvolvimento escolhida, sem tratá-lo como autenticação. Imagens remotas existentes podem gerar requisições do navegador a terceiros; não criar proxy ou fazer download pelo backend nesta entrega.

## Critérios de aceite e validação proposta

| ID | Resultado verificável | Evidência esperada |
|---|---|---|
| AC01 | Listagem respeita padrão, limite, filtros combinados e ordenação estável | Testes HTTP/repositório com dados controlados |
| AC02 | Query inválida retorna 400; `%` e `_` são buscados literalmente | Testes de validação e integração PostgreSQL isolado |
| AC03 | Total e páginas refletem os filtros; página excedente retorna vazio | Testes com mais de uma página e zero resultados |
| AC04 | Detalhes distinguem UUID inválido, ausente e existente | Testes HTTP 400/404/200 |
| AC05 | Preço `"50000.00"` aparece como R$ 50.000,00; null e mileage zero são tratados | Testes de apresentação |
| AC06 | Filtros, página, recarga, detalhes e Voltar preservam o estado | Teste de navegação ponta a ponta |
| AC07 | Carregamento, erro, vazio, imagem quebrada e 404 são utilizáveis | Testes de interface com respostas controladas |
| AC08 | Fluxo de consulta não chama OpenAI nem grava no banco | Verificação de dependências e testes com mocks |
| AC09 | Erros dos novos endpoints não expõem detalhes internos | Testes com falhas simuladas |
| AC10 | Fluxo funciona por teclado e nas três larguras especificadas | Verificação de acessibilidade e viewport |
| AC11 | Novos endpoints são aditivos; contratos POST permanecem compatíveis | Testes de regressão com mocks, sem chamadas pagas |

## Decisões pendentes e aprovação

- Tecnologia frontend e ferramentas de teste: decidida pelo usuário e aplicada em `frontend/` — Vite 8, React 19, React Router 8 (SPA, `createBrowserRouter`), TypeScript 7 estrito, CSS Modules, `fetch` com AbortController; Vitest 5, jsdom e Testing Library com `fetch` mockado. Playwright adiado.
- Organização escolhida: raiz Git em `cars/`, com `backend/` e `frontend/` lado a lado. Reorganização executada sem commits; os caminhos das duas Skills foram corrigidos e validados após aprovação fora do sandbox.
- Autenticação e acesso compartilhado: fora desta implementação local; obrigatórios como decisão antes de disponibilizar o produto a outros usuários.

Próximo passo: validar AC10, a regressão HTTP dos POST (AC11) e a integração com PostgreSQL isolado, conforme o [plano](plan.md). Não é necessário pedir novamente aprovação dos contratos aqui definidos. A aprovação não inclui reorganização do Git, migrations, chamadas pagas ou deploy.

## Evidências da entrega

Primeira entrega backend implementada em 29/10/2026: `GET /cars` e `GET /cars/:id`, com schemas estritos, serviço/controller de leitura e repositório Drizzle. Não houve alteração de schema, migration ou dependências.

Verificação TypeScript sem emissão e build aprovados; sete testes locais aprovados com `node:test` e tsx, repositório simulado e sem carregar `.env`, banco ou OpenAI. Runtime usado: Node v22.17.0, via caminho explícito com aprovação. Comandos executados a partir de `backend/`: `node_modules/typescript/bin/tsc -p tsconfig.json --noEmit`, `--import tsx --test tests/catalog.test.ts` e `node_modules/typescript/bin/tsc -p tsconfig.json`, todos usando `C:\nvm4w\nodejs\node.exe`. O build escreveu somente artefatos ignorados em `dist/`. Links locais da documentação conferidos.

- AC01/AC03: defaults, metadados, filtros combinados, vazio e página excedente testados no HTTP/service com mock. Ordenação, contagem e paginação SQL implementadas, ainda sem teste em PostgreSQL isolado.
- AC02: entradas inválidas/duplicadas/desconhecidas testadas; parâmetros SQL e escape de `%`, `_` e barra invertida verificados na compilação Drizzle. Sem confirmação de execução no PostgreSQL.
- AC04 e AC09: testes HTTP 400/404/200 e erros 500 seguros aprovados.
- AC08: plugin GET testado isoladamente sem OpenAI nem gravação; inicialização completa mantém a dependência de configuração anterior.
- AC11: handlers POST preservados; teste de regressão HTTP completo ainda pendente.
Interface de consulta implementada em `frontend/` em 07/11/2026, com a stack descrita na seção de decisões. Validação executada em `frontend/`: typecheck sem erros; 18 testes em 3 arquivos (formatação, catálogo e detalhes) aprovados, com todos os `fetch` verificados como GET; build aprovado. Backend: 11 testes aprovados, sem mudança nesta entrega.

- AC05: formatação de preço (`"50000.00"` em pt-BR/BRL), `null` e quilometragem zero validados por testes de interface.
- AC06: filtros, página, detalhes e Voltar validados com testes de navegação em memory router. Sem teste E2E em navegador real.
- AC07: carregamento, erro, vazio, imagem quebrada e 404 validados por testes de interface.
- AC08: frontend só faz GET, verificado nos testes.
- AC10: não validado. O CSS foi escrito para teclado e larguras de 360, 768 e 1280 px (grid `auto-fill` com `minmax(240px, 1fr)`, `aspect-ratio`, foco visível, labels), mas falta verificação manual ou Playwright.

A especificação inteira permanece em andamento, não concluída. Pendências: AC10, AC11 e integração PostgreSQL isolada.

# 003 — Login e cadastro de veículos

Status: implementada em 07/11/2026; AC17 pendente. A aprovação autoriza código, testes e documentação em `backend/` e `frontend/`, a **geração** do arquivo de migration e as dependências listadas em “Dependências”; **não** autoriza aplicar migrations em nenhum banco, criar usuários em banco real, commits, push ou deploy.

## Problema e objetivo

O catálogo interno só permite consulta pela interface. Cadastrar um veículo exige chamar `POST /cars` manualmente, e essa rota está aberta: qualquer cliente que alcance a API pode inserir dados. O roadmap (etapa 5) condiciona a administração à autenticação.

Objetivo: usuários internos entram com e-mail e senha, e somente usuários autenticados cadastram veículos por um formulário na interface. A consulta (`GET /cars`, `GET /cars/:id`) continua pública.

## Decisões confirmadas (07/11/2026, nesta conversa)

| Tema | Decisão |
|---|---|
| Autenticação | Sessão própria: tabelas `users` e `sessions` no PostgreSQL atual, senha com hash, cookie `httpOnly`. Sem provedor externo. |
| Usuários e papéis | Sem auto-cadastro nem papéis. Usuários criados por script CLI; todo usuário autenticado pode cadastrar. Consulta continua pública. |
| Escopo | Login, logout e cadastro. Edição e exclusão ficam para specs futuras. |
| Imagem | Continua `imageUrl` opcional, com pré-visualização no formulário. Sem upload. |

## Comportamento atual e evidências

- `POST /cars` não exige autenticação ([cars.routes.ts](../../../backend/src/modules/cars/cars.routes.ts)). Não há tabela de usuários ([schema/](../../../backend/src/db/schema/)).
- [createCarSchema](../../../backend/src/modules/cars/cars.schema.ts) não limita tamanho de texto, mas as colunas são `varchar(80/120/30/2048)`. Hipótese: um texto longo hoje gera erro do banco e resposta 500, não 400.
- O controller responde 400 com `details: (error as any).errors` ([cars.controller.ts](../../../backend/src/modules/cars/cars.controller.ts)). No Zod 4 os problemas ficam em `issues`. Hipótese a confirmar em teste: `details` sai vazio hoje. A resposta 500 inclui `message` com o erro interno do banco.
- O CORS ([cors.ts](../../../backend/src/config/cors.ts)) não habilita `credentials`. O cliente do frontend ([client.ts](../../../frontend/src/api/client.ts)) faz apenas `GET`, sem `credentials`.
- [db/client.ts](../../../backend/src/db/client.ts) importa `env.ts`, que exige `OPENAI_API_KEY`. Um script CLI que use `db` herda essa exigência.
- Testes de rota usam plugin Fastify com repositório injetado (`catalogRoutes`, [catalog.test.ts](../../../backend/tests/catalog.test.ts)). Esse padrão será seguido.

## Escopo e fora do escopo

**Inclui:** tabelas `users` e `sessions` e a migration gerada; `POST /auth/login`, `POST /auth/logout` e `GET /auth/me`; proteção de `POST /cars`; validação e erros seguros no cadastro; script CLI para criar usuário e redefinir senha; páginas `/login` e `/cars/new`; estado de sessão na barra superior; testes e documentação.

**Fora do escopo:** edição e exclusão de veículos; papéis e permissões; gestão de usuários pela interface; recuperação de senha por e-mail; MFA; upload de imagem; registro de autoria do veículo (`created_by`); paginação ou outras mudanças na busca IA além da decisão D1.

## Contratos da API e dados

### Schema (novo, `backend/src/db/schema/`)

`users`
| Coluna | Tipo | Regra |
|---|---|---|
| `id` | `uuid` PK | `defaultRandom()` |
| `email` | `varchar(254)` | `NOT NULL`, único; gravado com `trim` e minúsculas |
| `name` | `varchar(120)` | `NOT NULL` |
| `password_hash` | `varchar(255)` | `NOT NULL`; formato `scrypt$N$r$p$salt$hash` (base64) |
| `disabled_at` | `timestamptz` | nullable; preenchido = login bloqueado |
| `created_at`, `updated_at` | `timestamptz` | `defaultNow()`, `NOT NULL` |

`sessions`
| Coluna | Tipo | Regra |
|---|---|---|
| `id` | `varchar(64)` PK | SHA-256 em hex do token; o token em si nunca é gravado |
| `user_id` | `uuid` | FK `users.id`, `ON DELETE CASCADE`, índice |
| `created_at` | `timestamptz` | `defaultNow()` |
| `expires_at` | `timestamptz` | `NOT NULL`, índice |

Impacto: só adiciona tabelas, sem alterar `cars` nem dados existentes. Recuperação: `DROP TABLE sessions, users`. A migration `0001_*.sql` é gerada com `drizzle-kit generate`, que só escreve arquivos, e revisada no diff. Aplicar a migration exige autorização separada, com o banco alvo identificado.

### Sessão e cookie

- O token tem 32 bytes de `crypto.randomBytes` em base64url. O banco guarda só o hash.
- Cookie `sid` com `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` quando `NODE_ENV=production`, e `Max-Age` igual à duração da sessão.
- A duração é absoluta, sem renovação: `SESSION_TTL_HOURS`, padrão 8 (D3). Sessão expirada é tratada como ausente e apagada quando encontrada. O login também apaga as sessões expiradas do próprio usuário.
- Senha com `crypto.scrypt` nativo (N=2^15, r=8, p=1, salt de 16 bytes), comparada com `timingSafeEqual`. Login com e-mail inexistente também executa um scrypt contra um hash fixo, para igualar o tempo de resposta.
- Usuário desativado (`disabled_at`) não entra, e suas sessões existentes deixam de valer.

### CSRF e CORS

- `@fastify/cors` passa a usar `credentials: true`, mantendo a lista exata de `CORS_ORIGINS`.
- Rotas que alteram estado e exigem cookie (`POST /auth/logout`, `POST /cars`) recusam com **403** uma requisição cujo `Origin` exista e não esteja em `CORS_ORIGINS`. Sem `Origin`, como no curl, a requisição segue: a proteção contra CSRF vem de `SameSite=Lax` junto com o `Content-Type: application/json` obrigatório, que força preflight.
- Restrição de implantação: frontend e API precisam ser *same-site*, por exemplo `catalogo.empresa.com` e `api.empresa.com`. Em sites diferentes o cookie `Lax` não é enviado. Isso fica registrado em `docs/development.md`.

### Endpoints

| Rota | Auth | Requisição | Respostas |
|---|---|---|---|
| `POST /auth/login` | — | `{ "email": string, "password": string }` | `200 { "user": { id, email, name } }` + `Set-Cookie`; `400` validação; `401 { "error": "Invalid credentials" }`, sem dizer se o e-mail existe; `429` limite (D2) |
| `POST /auth/logout` | cookie opcional | — | `204` sempre, idempotente; apaga a sessão e o cookie |
| `GET /auth/me` | cookie | — | `200 { "user": { id, email, name } }`; `401 { "error": "Unauthorized" }` |
| `POST /cars` | **cookie obrigatório** | corpo atual | `201` com o veículo, sem mudança; `400` validação; `401` sem sessão; `403` origem; `500 { "error": "Failed to create car" }`, **sem** `message` interna |

Validação: e-mail com `trim` e minúsculas, até 254 caracteres; senha de 1 a 1024 caracteres no login, para não rodar scrypt com entrada gigante.

### Mudanças no contrato de `POST /cars` (incompatíveis, intencionais)

1. Passa a exigir sessão. Hoje não há cliente da rota além de chamadas manuais. Quem chama por curl precisa fazer login antes e enviar o cookie.
2. Validação mais estrita, alinhada às colunas: `trim` em todos os textos; `brand` até 80; `model` e `version` até 120; `fuel` e `transmission` até 30; `imageUrl` até 2048 e só `http` ou `https`; `year` entre 1886 e o ano atual + 1; `price` inteiro positivo até 9.999.999.999, que é o limite de `numeric(12,2)`; `mileage` inteiro de 0 a 2.000.000. Os campos obrigatórios não mudam.
3. Erro 400 padronizado: `{ "error": "Validation error", "details": [{ "path": "brand", "message": "..." }] }`.
4. Erro 500 sem a mensagem interna.

`POST /cars/search` depende da decisão D1. `GET /cars` e `GET /cars/:id` não mudam.

### Configuração

- Nova variável `SESSION_TTL_HOURS`, inteiro de 1 a 720, padrão 8. Entra em `.env.example`.
- O script CLI precisa só de `DATABASE_URL`. Para isso, a criação do pool passa a aceitar a URL sem exigir as variáveis da OpenAI, por exemplo com um `db/client` que valida apenas `DATABASE_URL`. A API continua validando a configuração completa na inicialização.

### Script CLI

Comando: `npm run user:create -- --email ana@empresa.com --name "Ana"`. A senha é lida do terminal sem eco, ou de `stdin` quando não há TTY. Nunca vem por argumento, para não ficar no histórico do shell. Exige no mínimo 12 caracteres e confirmação. Com `--reset-password`, o script troca a senha de um usuário existente e apaga as sessões dele. E-mail duplicado encerra com erro sem alterar nada. O script não imprime hash nem senha.

## Interface

- **Barra superior:** sem sessão, mostra “Entrar”. Com sessão, mostra o nome do usuário, um botão “Novo veículo” (link para `/cars/new`) e “Sair”. O estado vem de `GET /auth/me` na carga da aplicação, por um `AuthProvider`. Enquanto a resposta não chega, não aparece nem “Entrar” nem o nome, para evitar piscar.
- **`/login`:** campos e-mail (`autocomplete="username"`) e senha (`autocomplete="current-password"`), com botão desabilitado e “Entrando…” durante o envio. Em caso de `401`, mostra “E-mail ou senha incorretos” em `role="alert"` e devolve o foco à senha. Em `429`, avisa para tentar em alguns minutos. Erro de rede tem mensagem própria. No sucesso, vai para `next` (só caminhos internos começando com `/` e sem `//`; qualquer outro valor vira `/cars`). Usuário já logado que abre `/login` é redirecionado.
- **`/cars/new` (protegida):** sem sessão, redireciona para `/login?next=/cars/new`. Campos: marca, modelo, versão (opcional), ano, preço em reais (`inputMode="numeric"`, só dígitos, com o valor formatado “R$ 50.000,00” exibido ao lado), combustível, câmbio, quilometragem e URL da imagem (opcional, com pré-visualização pelo `CarImage` atual e fallback). Combustível e câmbio são texto livre com sugestões em `<datalist>` (Flex, Gasolina, Etanol, Diesel, Elétrico, Híbrido; Manual, Automático, CVT), sem mudar o contrato.
  - A validação no cliente usa um schema Zod próprio do frontend (`carFormSchema`), que espelha os limites do backend e roda ao enviar. O Zod do backend continua sendo a fonte da verdade; não há pacote compartilhado. Os erros aparecem por campo (`aria-invalid` e `aria-describedby`), com um resumo no topo e foco no primeiro campo inválido. Um `400` do servidor é mapeado pelo `path` de cada erro.
  - Enquanto envia, o botão fica desabilitado e o envio duplo é bloqueado. No `201`, a página navega para `/cars/:id` do veículo criado e mostra o aviso “Veículo cadastrado” (`role="status"`).
  - No `401`, que indica sessão expirada, o rascunho vai para `sessionStorage` (com try/catch), a página leva ao login com `next=/cars/new` e restaura o rascunho na volta. Um `500` ou erro de rede mostra um alerta e mantém os dados preenchidos.
- **Sair:** chama `POST /auth/logout`, limpa o estado e volta para `/cars`. Se estiver em `/cars/new`, sai dela.
- Todas as requisições passam a usar `credentials: "include"`. Os tokens visuais de [DESIGN.md](../../../frontend/DESIGN.md) valem em temas claro e escuro, com alvos de pelo menos 44px, layout responsivo em 360px e `document.title` por página.

## Segurança e serviços externos

Nenhum serviço externo novo. Riscos tratados:

- **Força bruta:** limite em `POST /auth/login` (D2).
- **Enumeração de e-mail:** mesma mensagem e tempo semelhante para e-mail inexistente e senha errada.
- **Roubo de token:** cookie `HttpOnly` e hash do token no banco.
- **Open redirect:** validação do `next`.
- **Logs:** o logger do Fastify não pode registrar o corpo do login nem o cabeçalho `cookie`. A configuração de redact cobre `req.headers.cookie`, e corpos não são logados por padrão.

Riscos que permanecem: não há rate limit nas demais rotas, e uma sessão roubada vale até expirar, porque não há tela para revogar sessões.

## Critérios de aceite

| # | Critério | Validação |
|---|---|---|
| AC1 | Login válido → 200, `Set-Cookie sid` com `HttpOnly`, `SameSite=Lax` e `Max-Age`, e uma sessão gravada só com o hash do token | teste backend (repositório simulado) |
| AC2 | E-mail inexistente, senha errada e usuário desativado → 401 com o mesmo corpo | teste backend |
| AC3 | `GET /auth/me`: 200 com sessão válida; 401 sem cookie, com cookie desconhecido ou com sessão expirada (e a expirada é apagada) | teste backend |
| AC4 | Logout → 204, sessão apagada, cookie limpo; repetir também dá 204 | teste backend |
| AC5 | `POST /cars` sem sessão → 401 e o repositório não é chamado; com sessão → 201 com o mesmo corpo de antes | teste backend |
| AC6 | `POST /cars` com `Origin` fora da lista → 403; sem `Origin` e com sessão → segue | teste backend |
| AC7 | Textos acima dos limites, ano e preço fora da faixa e URL não http(s) → 400 com `details[].path`; 500 não expõe a mensagem interna | teste backend |
| AC8 | Excesso de tentativas de login → 429 (se D2 aprovado) | teste backend |
| AC9 | Hash scrypt: verifica a senha correta, rejeita a errada, e salts diferentes geram hashes diferentes | teste unitário |
| AC10 | CLI cria usuário, recusa e-mail duplicado e senha curta, e `--reset-password` invalida as sessões | teste unitário com repositório simulado; execução real só com autorização e banco isolado |
| AC11 | Barra superior reflete a sessão; “Sair” encerra e volta ao catálogo | teste frontend (fetch mockado) |
| AC12 | `/cars/new` sem sessão redireciona ao login e volta depois; `next` externo (`//evil.com`, `https://…`) vai para `/cars` | teste frontend |
| AC13 | Formulário: erros por campo e foco no primeiro inválido; 400 do servidor mapeado; envio duplo bloqueado; sucesso navega aos detalhes com aviso | teste frontend |
| AC14 | 401 no envio preserva o rascunho e o restaura após o login | teste frontend |
| AC15 | Typecheck, testes e build de backend e frontend passam; os testes existentes continuam passando | validador |
| AC16 | Migration gerada contém só `CREATE TABLE users/sessions`, índices e FK | revisão do SQL |
| AC17 (pendente de ambiente) | Fluxo real login → cadastro → logout contra PostgreSQL isolado | só com banco isolado e autorização para aplicar a migration nele |

## Plano e validação

1. **Backend: base.** Schema `users` e `sessions`; `drizzle-kit generate` (só arquivos); separação do `db/client` para o CLI; `SESSION_TTL_HOURS` em `env.ts` e `.env.example`; `credentials: true` no CORS.
2. **Backend: módulo `src/modules/auth/`.** `password.ts` (scrypt), `auth.schema.ts`, `auth.repository.ts`, `auth.service.ts`, `auth.controller.ts`, `auth.routes.ts` (plugin com repositório injetado), hook `requireSession` (anexa `request.user`) e verificação de `Origin`. Registro do `@fastify/cookie` em `app.ts`.
3. **Backend: cadastro.** `createCarSchema` com limites; `requireSession` em `POST /cars`; erros 400 e 500 padronizados. O cadastro vira um plugin com repositório injetado, para permitir o teste.
4. **Backend: CLI.** `src/scripts/user.ts` e o script `user:create` no `package.json`.
5. **Backend: testes.** `tests/auth.test.ts` e `tests/cars-create.test.ts`, com o script `test` atualizado.
6. **Frontend.** `credentials: "include"` e funções `post` no cliente; `AuthProvider` e `useAuth`; `RequireAuth`; `LoginPage`; `CarFormPage` com validação; TopBar; aviso de sucesso na página de detalhes; testes.
7. **Documentação.** READMEs, `architecture.md`, `development.md` (CLI, cookie, *same-site*, migration pendente), `product.md` e `roadmap.md`.

Distribuição, conforme `AGENTS.md`: o **executor** implementa as etapas 1–6; o **validador** roda typecheck, testes e build de `backend/` e `frontend/`; o **documentador** faz a etapa 7; a sessão principal revisa o diff, em especial o SQL gerado e o módulo auth, com a skill `review-sensitive-changes`.

Efeitos dos comandos: `npm test`, `typecheck` e `build` não tocam banco nem OpenAI. `drizzle-kit generate` lê `drizzle.config.ts` e escreve em `src/db/migrations/`, sem conectar ao banco. Nenhum comando aplica a migration.

### Dependências

| Pacote | Onde | Justificativa |
|---|---|---|
| `@fastify/cookie` | backend | Plugin oficial para ler e assinar cookies; evita parser próprio |
| `@fastify/rate-limit` | backend | D2 aprovado; plugin oficial, em memória |
| `zod` (mesma major do backend, ^4) | frontend | Validação do formulário de cadastro com a mesma semântica do backend (decisão de 07/11/2026) |

Hash, token e comparação usam `node:crypto`, sem dependência nativa.

## Decisões pendentes e aprovação

| # | Pergunta | Recomendação |
|---|---|---|
| D1 | `POST /cars/search` (chamada paga à OpenAI) também deve exigir login? | **Sim.** Ninguém de fora deveria gerar custo; o frontend não usa essa rota hoje. |
| D2 | Limitar tentativas de login com `@fastify/rate-limit`? | **Sim**, 5 tentativas por minuto por IP em `/auth/login`, em memória. Atrás de proxy, depende de `trustProxy`, que fica para a etapa de operação. |
| D3 | Duração da sessão | **8 h absolutas**, configurável por `SESSION_TTL_HOURS`. |
| D4 | Senha mínima no CLI | **12 caracteres**, sem regras de composição. |

Aprovação: o usuário aprovou em 07/11/2026, nesta conversa ("Aprovo"), com as recomendações acima. D1 sim (`POST /cars/search` exige sessão, com 401 sem ela); D2 sim (5 tentativas por minuto por IP); D3 8 h; D4 12 caracteres. Validação do formulário com Zod no frontend, escolhida na mesma data. Depois, em 07/11/2026, o usuário autorizou aplicar a migration no banco atual (Neon `neondb`), e ela foi aplicada. Continuam sem autorização: criar usuários em banco real, commits, push e deploy.

## Evidências da entrega

Implementada em 07/11/2026. Validação executada pelo validador, sem banco e sem OpenAI: backend typecheck ok, `npm test` 33/33, build ok; frontend typecheck ok, `npm test` 46/46 em 5 arquivos, build ok (bundle JS 429.40 kB).

| AC | Evidência | Situação |
|---|---|---|
| AC1 | `backend/tests/auth.test.ts`: cookie `HttpOnly`, `SameSite=Lax`, `Max-Age` e hash do token gravado | OK |
| AC2 | `backend/tests/auth.test.ts`: e-mail inexistente, senha errada e usuário desativado com o mesmo 401 | OK |
| AC3 | `backend/tests/auth.test.ts`: `GET /auth/me` com sessão, sem cookie, cookie desconhecido e sessão expirada | OK |
| AC4 | `backend/tests/auth.test.ts`: logout 204, idempotente, sessão apagada e cookie limpo | OK |
| AC5 | `backend/tests/cars-create.test.ts`: 401 sem sessão sem chamar o repositório; 201 com sessão | OK |
| AC6 | `backend/tests/cars-create.test.ts`: 403 para `Origin` não listada; sem `Origin` segue. Também `backend/tests/auth.test.ts` para logout | OK |
| AC7 | `backend/tests/cars-create.test.ts`: 400 com `details[].path`, limites e trim; 500 sem mensagem interna | OK |
| AC8 | `backend/tests/auth.test.ts`: 429 após excesso de tentativas por IP | OK |
| AC9 | `backend/tests/password.test.ts`: verificação, rejeição e salts distintos | OK |
| AC10 | `backend/tests/user-cli.test.ts`, com repositório simulado. Execução real do CLI e leitura de senha sem eco em terminal real não foram feitas | Parcial |
| AC11 | `frontend/tests/auth.test.tsx`: barra superior com e sem sessão, e “Sair” | OK |
| AC12 | `frontend/tests/auth.test.tsx`: redirecionamento para `/login` e retorno; `next` validado | OK |
| AC13 | `frontend/tests/auth.test.tsx`: erros por campo, mapeamento do 400, envio duplo e aviso no sucesso | OK |
| AC14 | `frontend/tests/auth.test.tsx`: 401 preserva e restaura o rascunho | OK |
| AC15 | Validador, 07/11/2026 (números acima) | OK |
| AC16 | `backend/src/db/migrations/0001_smart_red_shift.sql`: só `CREATE TABLE` de `users` e `sessions`, FK com `ON DELETE CASCADE` e índices | OK |
| AC17 | Fluxo login → cadastro → logout contra PostgreSQL real. Migration `0001` aplicada no Neon `neondb` em 07/11/2026 (tabelas `users` e `sessions` criadas, `cars` intacta com 2 linhas). Fluxo ainda não executado: falta criar um usuário | Pendente |

Não verificados: layout de 360 px em navegador real e leitura de senha sem eco em terminal real.

Achado confirmado: no Zod 4 o `details` do 400 antigo saía `undefined`, porque `errors` não existe; o novo formato usa `issues`.

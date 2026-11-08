# Desenvolvimento

## Ambiente

A raiz Git é `cars/`. Execute os comandos da API a partir de `cars/backend/`. O projeto usa npm e TypeScript ESM. A versão de Node.js, a versão de npm e a versão do servidor PostgreSQL ainda precisam ser definidas. Não infira o runtime a partir de `@types/node`.

As dependências estão declaradas em `package.json` e resolvidas em `package-lock.json`. Instalação ou atualização de dependências não faz parte da entrega inicial de documentação.

## Variáveis de ambiente

`src/config/env.ts` carrega dotenv e valida:

| Variável | Regra |
|---|---|
| `NODE_ENV` | `development`, `production` ou `test`; padrão `development` |
| `PORT` | Inteiro a partir de 1; padrão `3333` |
| `DATABASE_URL` | String não vazia |
| `OPENAI_API_KEY` | String não vazia |
| `OPENAI_MODEL` | String não vazia; modelo não fixado no código |
| `CORS_ORIGINS` | Lista de origens `http(s)` separadas por vírgula, sem caminho ou barra final; vazio fora de produção usa `http://localhost:5173`; obrigatório em `production` |
| `SESSION_TTL_HOURS` | Inteiro de 1 a 720; padrão `8`. Duração absoluta da sessão de login, sem renovação |

`backend/.env.example` é o modelo versionado, sem segredos. Copie-o para `backend/.env` (ignorado pelo Git) e preencha os valores. Enquanto `DATABASE_URL`, `OPENAI_API_KEY` ou `OPENAI_MODEL` estiverem vazios, a inicialização falha na validação. Não copie valores de `.env` para documentação, logs ou commits.

## Comandos existentes

| Comando | Efeito |
|---|---|
| `npm run build` | Executa `tsc -p tsconfig.json` e escreve em `dist/` |
| `npm run dev` | Executa `tsx watch src/server.ts`, inicia servidor e carrega configuração |
| `npm run typecheck` | Verifica tipos sem emitir arquivos |
| `npm test` | Executa testes locais de catálogo, busca IA, CORS, autenticação, cadastro, senha e CLI com node:test e tsx; repositório e OpenAI simulados, sem banco ou OpenAI real |
| `npm run user:create -- --email <e-mail> --name "<nome>"` | Cria usuário (ou `--reset-password` para trocar a senha). Ver [Autenticação e usuários](#autenticação-e-usuários) |

Iniciar o servidor constrói clientes de banco e OpenAI. Chamadas a `POST /cars` exigem sessão e gravam no banco; chamadas a `POST /cars/search` exigem sessão, acionam OpenAI (uma chamada por busca, com timeout de 10 s) e leem o banco. Testes automatizados não fazem chamadas reais.

## Autenticação e usuários

- Login por cookie `sid` (`/auth/login`, `/auth/logout`, `/auth/me`). A duração da sessão vem de `SESSION_TTL_HOURS`.
- Usuários não são criados pela API. Use o CLI, com `DATABASE_URL` configurada e a migration `0001` aplicada no banco alvo:

```sh
npm run user:create -- --email ana@empresa.com --name "Ana"
npm run user:create -- --email ana@empresa.com --reset-password
```

  A senha é lida do terminal sem eco ou da primeira linha do `stdin` quando não há TTY. Nunca passe a senha como argumento. Mínimo de 12 caracteres, com confirmação. `--reset-password` apaga as sessões do usuário. A leitura sem eco em terminal real ainda não foi exercitada.
- **Same-site:** o cookie usa `SameSite=Lax`. Frontend e API precisam ser *same-site*, por exemplo `catalogo.empresa.com` e `api.empresa.com`. Em sites diferentes, o navegador não envia o cookie e o login não se mantém.
- Rate limit de 5 tentativas por minuto por IP em `/auth/login`, em memória. Sem `trustProxy` configurado; atrás de proxy, isso precisa ser definido na etapa de operação.
- `tsconfig.json` do backend não inclui `tests/`: `typecheck` não verifica os testes. `GET /health` indica apenas que o processo responde; não verifica essas dependências.

## Frontend

Execute os comandos da interface a partir de `cars/frontend/`, com o backend rodando. O projeto usa npm, Vite 8, React 19, TypeScript 7 estrito e Vitest 5.

Copie `frontend/.env.example` para `frontend/.env` (ignorado pelo Git) se precisar alterar a URL da API. A variável é:

| Variável | Regra |
|---|---|
| `VITE_API_URL` | URL base da API; padrão `http://localhost:3333` quando ausente |

Variáveis `VITE_` são incluídas no bundle do navegador: nunca coloque segredos nelas. A origem `http://localhost:5173` (porta do Vite, `strictPort`) é o padrão de `CORS_ORIGINS` do backend.

| Comando | Efeito |
|---|---|
| `npm run dev` | Inicia o Vite na porta 5173 |
| `npm run build` | Executa `tsc` e `vite build`, escrevendo `dist/` |
| `npm run typecheck` | Verifica tipos sem emitir arquivos |
| `npm test` | Executa `vitest run` com jsdom e Testing Library; `fetch` mockado, sem API real |
| `npm run preview` | Serve o build de `dist/` |

Os testes do frontend cobrem formatação, catálogo, detalhes, redesign, autenticação/cadastro e busca inteligente (75 testes em 6 arquivos, validados em 07/11/2026, após a spec 005). Playwright não é dependência do projeto e não está na suíte; o AC10 da spec 001 (teclado e larguras 360, 768 e 1280 px) foi verificado em 07/11/2026 com Chrome headless e API simulada (evidências na spec).

## Verificação de tipos sem emissão

Com dependências já instaladas, no PowerShell:

```powershell
.\node_modules\.bin\tsc.cmd -p tsconfig.json --noEmit
```

Em ambientes POSIX:

```sh
./node_modules/.bin/tsc -p tsconfig.json --noEmit
```

Esses comandos não são scripts npm existentes. Não iniciam a aplicação nem devem exigir chamadas aos serviços externos.

## Testes e automação

Há 50 testes em 7 arquivos, usando `node:test`, Fastify inject e tsx, com repositório, interpretador e cliente OpenAI simulados: `catalog.test.ts` (GET do catálogo, faixas e filtros SQL), `ai-search.test.ts` (`POST /cars/search`: 422, 503, 429, log e interpretador com cliente simulado), `cors.test.ts` (validação de `CORS_ORIGINS` e cabeçalhos), `auth.test.ts` (login, logout, `/auth/me`, limite de tentativas), `cars-create.test.ts` (`POST /cars` com sessão), `password.test.ts` (scrypt) e `user-cli.test.ts` (lógica do CLI). Ainda não há integração com PostgreSQL isolado, linter, formatter ou CI/CD. Não existem scripts `lint`, `format`, `start` ou migrations.

O runtime disponível foi identificado como Node v22.17.0 em `C:\nvm4w\nodejs\node.exe` (link para instalação fora do sandbox). Isso é uma observação do ambiente, não uma versão fixada pelo projeto. Na sessão atual, executar esse runtime exigiu aprovação fora do sandbox. Se `node` não estiver no PATH, é possível executar o typecheck com esse binário e `node_modules/typescript/bin/tsc`, ou os testes com `--import tsx --test tests/catalog.test.ts`, a partir do backend e com a aprovação necessária.

Pendente: banco isolado para integração (AC17 da spec 003). Sem integração real com OpenAI; o AC16 da spec 004 (chamadas reais) exige autorização explícita. Escolha de ferramentas, scripts e CI exige implementação própria. Não use banco de produção ou chamadas pagas como validação padrão.

## Banco e migrations

O Drizzle Kit está instalado e configurado para PostgreSQL. `src/db/migrations/0001_smart_red_shift.sql` foi gerada em 07/11/2026 para `users` e `sessions`, e foi aplicada em 07/11/2026 no banco Neon `neondb` configurado em `DATABASE_URL`, com autorização do usuário (registrada em `drizzle.__drizzle_migrations`, id 2). Gerar a migration só escreve arquivos; aplicá-la exige autorização específica e o banco alvo identificado. Recuperação, se necessária: `DROP TABLE sessions, users`. Não há procedimento operacional validado para aplicar migrations. Antes de executar qualquer operação, identifique o banco alvo, examine o SQL, avalie dados existentes e obtenha autorização específica. Não use `push`, reset ou migrations automaticamente para corrigir erros de ambiente.

## Estado da documentação inicial

Esta configuração foi baseada em leitura do código, manifests e migration. Build, verificação de tipos, servidor e integrações não foram executados como parte dessa análise. Ao realizar validações futuras, registre comando, resultado e limites na especificação correspondente.

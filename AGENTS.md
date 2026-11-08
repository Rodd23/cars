# Instruções para agentes

## Contexto e referências

Este repositório contém o backend de um catálogo de veículos e a interface web de consulta do catálogo em `frontend/`, implementada em 07/11/2026 (listagem, filtros, paginação e detalhes). Login por sessão e cadastro de veículos pela interface foram implementados em 07/11/2026 (spec 003); edição e exclusão não. O refinamento visual com Tailwind CSS e shadcn/ui foi implementado em 07/11/2026 (spec 005). A raiz Git é `cars/`; a aplicação existente permanece em `backend/`. Consulte também `backend/AGENTS.md` ao alterar a API.

- [README.md](README.md): entrada do projeto; [backend/README.md](backend/README.md): descrição da API; [frontend/README.md](frontend/README.md): interface web.
- [docs/product.md](docs/product.md): direção do produto e decisões pendentes.
- [docs/architecture.md](docs/architecture.md): arquitetura implementada.
- [docs/development.md](docs/development.md): configuração e comandos.
- [docs/roadmap.md](docs/roadmap.md): sequência proposta de evolução.
- [docs/workflow-ia.md](docs/workflow-ia.md): subagentes por modelo (`.claude/agents/`) e economia de tokens.

## Delegação a subagentes

O usuário pede e autoriza, de forma permanente, o uso dos subagentes de `.claude/agents/` sem confirmação a cada tarefa:

- **executor** (Sonnet): toda implementação com escopo já aprovado que envolva mais de um arquivo ou mais que poucas linhas. A sessão principal planeja e revisa; o executor escreve o código.
- **validador** (Haiku): typecheck, testes e build após mudanças de código, em vez de rodar e ler a saída completa na sessão principal.
- **documentador** (Haiku): atualização de documentação depois de uma entrega, com a lista de fatos a registrar.
- **explorador** (Haiku): buscas que exigiriam ler vários arquivos para localizar algo.
- **arquiteto** (Opus): specs, decisões técnicas e revisões sensíveis **somente quando a sessão principal não estiver em Opus**; se já estiver, faça direto, pois delegar só duplicaria o custo.

Não delegue edições triviais (uma linha, um arquivo pequeno já lido) nem perguntas que se respondem com o contexto atual. Ao delegar, passe tarefa completa: arquivos, comportamento esperado, restrições e critério de pronto. Confira o resultado antes de relatar ao usuário.

Confirme informações no código antes de alterá-lo. Registre propostas como propostas; não descreva funcionalidades futuras como existentes.

## Arquitetura e convenções

- Preserve TypeScript ESM, imports relativos com extensão `.js` e as opções estritas do `backend/tsconfig.json`.
- Mantenha rotas, validação HTTP, serviços, persistência e interpretação da IA em suas camadas existentes em `backend/src/modules/cars/`.
- Mantenha acesso ao banco no repositório e definição de tabelas em `backend/src/db/schema/`.
- Derive tipos dos schemas Zod quando aplicável. Siga o estilo do arquivo alterado sem reformatação alheia ao escopo.
- Não edite `dist/` ou `node_modules/` como fonte. Justifique novas dependências e mudanças de contrato.

## Trabalho por especificações

Use a Skill [spec-workflow](.agents/skills/spec-workflow/SKILL.md) para novas funcionalidades e mudanças de comportamento. Prepare a especificação em `docs/specs/` com o [modelo](docs/specs/TEMPLATE.md) e obtenha aprovação antes de implementar. Uma correção pequena pode usar uma especificação curta na conversa, com comportamento esperado e validação.

A aprovação autoriza a execução do escopo definido, sem confirmações para cada edição ou decisão rotineira. Mudanças materiais de escopo devem ser apresentadas ao usuário. Instruções explícitas da tarefa prevalecem; autorização para implementação não autoriza operações externas ou destrutivas.

Use a Skill [review-sensitive-changes](.agents/skills/review-sensitive-changes/SKILL.md) para avaliar mudanças relevantes de schema, autenticação ou comportamento da busca OpenAI, e quando uma revisão dessas áreas for solicitada.

## Validação e limites

Consulte `docs/development.md` para comandos e seus efeitos. Existem scripts `dev`, `build`, `typecheck` e `test`; os testes do catálogo usam repositório simulado. Não presuma integração PostgreSQL, lint ou CI configurados. Relate exatamente o que foi executado e os resultados.

- Use mocks para OpenAI e banco isolado para testes de integração.
- Não leia ou exponha valores de `.env` e credenciais sem necessidade e autorização específica. Nunca versione segredos.
- Não execute migrations, `drizzle-kit push`, resets ou operações destrutivas sem autorização explícita para a operação e o ambiente.
- Não faça chamadas reais pagas à OpenAI como validação padrão, nem use dados ou credenciais de produção em testes.
- Não faça commits, pushes ou deploys sem autorização explícita.
- Respeite tarefas de análise como somente leitura e preserve alterações do usuário.

## Pontos de atenção

A busca IA (`POST /cars/search`, spec 004, implementada em 07/11/2026) interpreta marca, modelo, versão, ano, quilometragem e preço; critérios que a tool não cobre voltam em `ignored`. Argumentos inválidos geram 422 sem consulta ao catálogo; falhas do provedor geram 503 sem mensagem bruta. A busca devolve a primeira página e reaproveita `GET /cars`, que pagina. Não há filtro de combustível, câmbio ou cor. Toda busca faz uma chamada à OpenAI, com timeout de 10 s e 1 nova tentativa; o rate limit de 10 por minuto por usuário é em memória. A tool usa `strict: true`: se `OPENAI_MODEL` não aceitar essa forma, toda busca responde 503, e só o AC16 da spec 004 (chamada real, sem autorização) confirmaria. `POST /cars` e `POST /cars/search` exigem sessão (cookie `sid`); não há papéis, e todo usuário autenticado cadastra. Rate limit existe em `POST /auth/login` (por IP, em memória, sem `trustProxy`) e em `POST /cars/search` (por usuário). A migration `0001` (users/sessions) foi aplicada em 07/11/2026 no banco Neon `neondb` configurado em `DATABASE_URL`, com autorização do usuário. `price` aceita inteiro positivo no cadastro (até 9.999.999.999) e é persistido como `numeric(12,2)` por conversão para string. Não altere esses contratos silenciosamente.

## Entrega

Informe o comportamento resultante, os arquivos relevantes, a validação executada e as limitações. Atualize a documentação quando contratos, arquitetura ou operação mudarem.

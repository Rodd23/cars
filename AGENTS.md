# Instruções para agentes

## Contexto e referências

Este repositório contém o backend de um catálogo de veículos e a interface web de consulta do catálogo em `frontend/`, implementada em 07/11/2026 (listagem, filtros, paginação e detalhes; sem cadastro). A raiz Git é `cars/`; a aplicação existente permanece em `backend/`. Consulte também `backend/AGENTS.md` ao alterar a API.

- [README.md](README.md): entrada do projeto; [backend/README.md](backend/README.md): descrição da API; [frontend/README.md](frontend/README.md): interface web.
- [docs/product.md](docs/product.md): direção do produto e decisões pendentes.
- [docs/architecture.md](docs/architecture.md): arquitetura implementada.
- [docs/development.md](docs/development.md): configuração e comandos.
- [docs/roadmap.md](docs/roadmap.md): sequência proposta de evolução.
- [docs/workflow-ia.md](docs/workflow-ia.md): subagentes por modelo (`.claude/agents/`) e economia de tokens. Delegue a eles conforme essa tabela quando a tarefa justificar o custo de um contexto novo.

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

A busca IA implementa marca, modelo e versão; ano e quilometragem aparecem no prompt, mas não nos filtros. Argumentos inválidos da IA podem resultar em filtros vazios e consulta de todo o catálogo. A listagem GET tem paginação; a busca IA POST permanece sem paginação. Não há autenticação ou rate limiting implementados. `price` aceita inteiro positivo no cadastro e é persistido como `numeric(12,2)` por conversão para string. Não altere esses contratos silenciosamente.

## Entrega

Informe o comportamento resultante, os arquivos relevantes, a validação executada e as limitações. Atualize a documentação quando contratos, arquitetura ou operação mudarem.

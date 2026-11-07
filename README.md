# Cars

Catálogo de veículos com backend TypeScript/Fastify e frontend React para consulta do catálogo.

```text
cars/
  backend/     API Fastify (package.json, .env.example, src/, tests/)
  frontend/    interface web React/Vite (package.json, .env.example, src/, tests/)
  docs/        produto, arquitetura, desenvolvimento, roadmap e specs
  .agents/     skills locais de especificação e revisão
```

- [backend/](backend/README.md): API existente, dependências e scripts próprios.
- [frontend/](frontend/README.md): interface de consulta do catálogo (listagem, filtros, paginação e detalhes), implementada em 07/11/2026.
- [Produto](docs/product.md), [arquitetura](docs/architecture.md), [desenvolvimento](docs/development.md) e [roadmap](docs/roadmap.md).
- [AGENTS.md](AGENTS.md): instruções compartilhadas; [workflow-ia.md](docs/workflow-ia.md): subagentes por modelo.

A [especificação do catálogo interno](docs/specs/001-catalogo-web/spec.md) está aprovada. Backend e interface foram implementados; a spec segue em andamento por causa de pendências de acessibilidade/viewport (AC10), regressão HTTP dos POST (AC11) e integração PostgreSQL isolada.

Cada aplicação tem manifests próprios; não há workspace npm na raiz. Para a API, execute os comandos em `backend/` e copie `backend/.env.example` para `backend/.env` com seus valores. Para a interface, siga [frontend/README.md](frontend/README.md). Consulte [desenvolvimento](docs/development.md).
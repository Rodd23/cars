# Roadmap proposto

Esta sequência orienta o planejamento; não autoriza implementação de funcionalidades ou operações externas.

| Etapa | Entrega | Condição para avançar |
|---|---|---|
| 1. Base de documentação | AGENTS.md, contexto do produto, arquitetura, desenvolvimento, modelo de spec e duas Skills | Revisão dos documentos |
| 2. Contrato do catálogo web | Especificação de listagem paginada, detalhes, preço, filtros e estados de tela | Decisões de público, indexação e papel da IA; spec aprovada |
| 3. Base de qualidade | Runtime definido, ferramentas de validação, testes prioritários e CI | Escopo e ferramentas aprovados; checks reproduzíveis |
| 4. Primeiro fluxo web | API e interface para consultar catálogo e detalhes | Em andamento: API e interface implementadas em 07/11/2026; pendentes AC11 (regressão HTTP dos POST) e integração PostgreSQL isolada |
| 5. Administração | Autenticação e autorização para operações de cadastro, edição e exclusão | Em andamento (parcial): login, logout e cadastro implementados em 07/11/2026 pela [spec 003](specs/003-login-cadastro/spec.md), sem papéis; pendentes edição, exclusão, papéis e AC17 (fluxo real contra PostgreSQL isolado) |
| 6. Busca por IA | Filtros coerentes, falhas explícitas e controle de volume/custo | Concluída em 07/11/2026 pela [spec 004](specs/004-busca-ia/spec.md), exceto AC16 (chamadas reais à OpenAI, sem autorização). Orçamento mensal com bloqueio segue fora de escopo |
| 7. Operação | Hospedagem, deploy e procedimento de migrations | Ambiente e estratégia de recuperação definidos |

A correção das falhas da busca pode ser antecipada se a IA participar da primeira entrega. Uma spec deve decidir o comportamento de argumentos inválidos, filtros não suportados e listagem sem filtros.

## Organização futura

A raiz Git foi reorganizada para `cars/`, com `backend/` e documentação compartilhada. O histórico foi preservado. `frontend/` contém a interface de consulta do catálogo, implementada em 07/11/2026 com a stack aprovada pelo usuário. Consulte as evidências no [plano de reorganização](specs/001-catalogo-web/repository-plan.md).

Não criar workspaces ou pacotes compartilhados somente para preencher uma estrutura. Acrescentar cada parte quando seu uso estiver definido.

## Próxima especificação

[001 — Catálogo web interno](specs/001-catalogo-web/spec.md), com [plano](specs/001-catalogo-web/plan.md): contratos e comportamentos aprovados pelo usuário em 29/10/2026. Uso interno, filtros tradicionais primeiro e preços em BRL. Backend e frontend foram implementados; a spec segue em andamento até as pendências AC11 e integração PostgreSQL isolada serem validadas.

[003 — Login e cadastro de veículos](specs/003-login-cadastro/spec.md): implementada em 07/11/2026, exceto AC17 (fluxo real contra PostgreSQL isolado), que segue pendente. A migration `users`/`sessions` foi aplicada em 07/11/2026 no banco Neon `neondb` configurado em `DATABASE_URL`, com autorização do usuário. Edição e exclusão ficam para specs futuras.

[004 — Busca por IA confiável](specs/004-busca-ia/spec.md): implementada em 07/11/2026, exceto AC16 (três buscas reais, só com autorização para chamada paga). Filtros de ano, quilometragem e preço em `GET /cars`, erros explícitos (422, 503, 429), rate limit por usuário e campo de busca no catálogo web.

[002 — Redesign do frontend](specs/002-redesign-frontend/spec.md): aprovada e implementada em 07/11/2026, somente no frontend e sem mudança de contratos. Sistema visual em [frontend/DESIGN.md](../frontend/DESIGN.md), com tema claro e escuro, e melhorias de usabilidade U01–U16.

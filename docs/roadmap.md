# Roadmap proposto

Esta sequência orienta o planejamento; não autoriza implementação de funcionalidades ou operações externas.

| Etapa | Entrega | Condição para avançar |
|---|---|---|
| 1. Base de documentação | AGENTS.md, contexto do produto, arquitetura, desenvolvimento, modelo de spec e duas Skills | Revisão dos documentos |
| 2. Contrato do catálogo web | Especificação de listagem paginada, detalhes, preço, filtros e estados de tela | Decisões de público, indexação e papel da IA; spec aprovada |
| 3. Base de qualidade | Runtime definido, ferramentas de validação, testes prioritários e CI | Escopo e ferramentas aprovados; checks reproduzíveis |
| 4. Primeiro fluxo web | API e interface para consultar catálogo e detalhes | Em andamento: API e interface implementadas em 07/11/2026; pendentes AC10 (teclado e viewports), AC11 (regressão HTTP dos POST) e integração PostgreSQL isolada |
| 5. Administração | Autenticação e autorização para operações de cadastro, edição e exclusão | Papéis e regras aprovados antes de expor administração |
| 6. Busca por IA | Filtros coerentes, falhas explícitas e controle de volume/custo | Comportamentos e orçamento definidos |
| 7. Operação | Hospedagem, deploy e procedimento de migrations | Ambiente e estratégia de recuperação definidos |

A correção das falhas da busca pode ser antecipada se a IA participar da primeira entrega. Uma spec deve decidir o comportamento de argumentos inválidos, filtros não suportados e listagem sem filtros.

## Organização futura

A raiz Git foi reorganizada para `cars/`, com `backend/` e documentação compartilhada. O histórico foi preservado. `frontend/` contém a interface de consulta do catálogo, implementada em 07/11/2026 com a stack aprovada pelo usuário. Consulte as evidências no [plano de reorganização](specs/001-catalogo-web/repository-plan.md).

Não criar workspaces ou pacotes compartilhados somente para preencher uma estrutura. Acrescentar cada parte quando seu uso estiver definido.

## Próxima especificação

[001 — Catálogo web interno](specs/001-catalogo-web/spec.md), com [plano](specs/001-catalogo-web/plan.md): contratos e comportamentos aprovados pelo usuário em 29/10/2026. Uso interno, filtros tradicionais primeiro e preços em BRL. Backend e frontend foram implementados; a spec segue em andamento até as pendências AC10, AC11 e integração PostgreSQL isolada serem validadas.

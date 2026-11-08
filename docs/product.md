# Direção do produto

## Objetivo

Evoluir o catálogo de veículos com novas funcionalidades e uma interface web, em entregas pequenas guiadas por especificações aprovadas.

## Estado atual

Existe uma API para cadastrar veículos e buscar o catálogo por texto com apoio da OpenAI, que interpreta o pedido em filtros validados (spec 004, implementada em 07/11/2026). A API também oferece listagem paginada e detalhes, e existe uma interface web de consulta do catálogo em `frontend/`, implementada em 07/11/2026. Usuários internos entram com e-mail e senha e cadastram veículos por um formulário na interface (spec 003, implementada em 07/11/2026; fluxo real contra PostgreSQL ainda pendente). Edição e exclusão não estão implementadas. A arquitetura está descrita em [architecture.md](architecture.md).

## Primeiro incremento proposto

Um catálogo web para consultar veículos, navegar por resultados e visualizar detalhes. Listagem paginada, endpoint de detalhes e seus contratos precisam ser especificados e implementados; não existem hoje.

A primeira especificação deve definir os estados de carregamento, vazio e erro, responsividade, acessibilidade, filtros e a representação de preço. Deve distinguir consulta do catálogo de administração de dados.

## Decisões confirmadas para o primeiro catálogo web

- Uso interno, sem requisito de indexação em buscadores nesta entrega.
- Filtros tradicionais primeiro; integração da IA ao frontend depois. A integração foi feita pela spec 004, em 07/11/2026, como campo "Busca inteligente" para usuários logados.
- Preços em BRL, em unidades de real: `50000` representa R$ 50.000,00.
- Tecnologia frontend: Vite 8, React 19, React Router 8, TypeScript 7 estrito, `fetch` com AbortController; testes com Vitest 5, jsdom e Testing Library. Playwright adiado como dependência de teste. Estilização: Tailwind CSS v4 com componentes shadcn/ui sobre Radix, implementada em 07/11/2026 pela spec 005, em substituição a CSS Modules (que vigoravam desde a spec 001, até essa data).

A [especificação inicial](specs/001-catalogo-web/spec.md) define a consulta local. Seus contratos e comportamentos foram aprovados pelo usuário em 29/10/2026. A interface de consulta foi implementada em 07/11/2026, com os campos exibidos definidos pela spec. A raiz Git foi organizada em `cars/`, com o backend e o frontend separados.

## Decisões pendentes

- Perfil dos usuários internos e forma de disponibilização compartilhada.
- Quem poderá editar e excluir veículos. Para cadastro, a spec 003 decidiu: usuários criados por CLI, sem papéis, e todo usuário autenticado pode cadastrar.
- Requisitos de hospedagem e orçamento para serviços externos.

Essas decisões pendentes não estão aprovadas. Edição, exclusão, papéis, uploads e novas integrações exigem especificações próprias quando priorizadas. Autenticação de login e cadastro foi especificada na spec 003. Uso interno não substitui autenticação e autorização.

## Critério de evolução

Priorize fluxos utilizáveis de ponta a ponta. Cada incremento deve ter critérios de aceite verificáveis e validações proporcionais. Consulte o [roadmap](roadmap.md).

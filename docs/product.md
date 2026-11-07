# Direção do produto

## Objetivo

Evoluir o catálogo de veículos com novas funcionalidades e uma interface web, em entregas pequenas guiadas por especificações aprovadas.

## Estado atual

Existe uma API para cadastrar veículos e buscar o catálogo por texto com apoio da OpenAI. A API também oferece listagem paginada e detalhes, e existe uma interface web de consulta do catálogo em `frontend/`, implementada em 07/11/2026. Não há autenticação implementada, nem cadastro pela interface. A arquitetura está descrita em [architecture.md](architecture.md).

## Primeiro incremento proposto

Um catálogo web para consultar veículos, navegar por resultados e visualizar detalhes. Listagem paginada, endpoint de detalhes e seus contratos precisam ser especificados e implementados; não existem hoje.

A primeira especificação deve definir os estados de carregamento, vazio e erro, responsividade, acessibilidade, filtros e a representação de preço. Deve distinguir consulta do catálogo de administração de dados.

## Decisões confirmadas para o primeiro catálogo web

- Uso interno, sem requisito de indexação em buscadores nesta entrega.
- Filtros tradicionais primeiro; integração da IA ao frontend depois.
- Preços em BRL, em unidades de real: `50000` representa R$ 50.000,00.
- Tecnologia frontend: Vite 8, React 19, React Router 8, TypeScript 7 estrito, CSS Modules, `fetch` com AbortController; testes com Vitest 5, jsdom e Testing Library. Playwright adiado.

A [especificação inicial](specs/001-catalogo-web/spec.md) define a consulta local. Seus contratos e comportamentos foram aprovados pelo usuário em 29/10/2026. A interface de consulta foi implementada em 07/11/2026, com os campos exibidos definidos pela spec. A raiz Git foi organizada em `cars/`, com o backend e o frontend separados.

## Decisões pendentes

- Perfil dos usuários internos e forma de disponibilização compartilhada.
- Quem poderá cadastrar, editar e excluir veículos.
- Requisitos de hospedagem e orçamento para serviços externos.

Essas decisões pendentes não estão aprovadas. Autenticação, edição, exclusão, uploads e novas integrações exigem especificações próprias quando priorizadas. Uso interno não substitui autenticação e autorização.

## Critério de evolução

Priorize fluxos utilizáveis de ponta a ponta. Cada incremento deve ter critérios de aceite verificáveis e validações proporcionais. Consulte o [roadmap](roadmap.md).

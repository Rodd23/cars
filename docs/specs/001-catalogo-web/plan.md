# Plano — Catálogo web interno

Status: contratos e comportamentos da [spec](spec.md) aprovados em 29/10/2026. Primeira entrega backend implementada: listagem paginada, detalhes, sete testes locais, typecheck e build aprovados. Etapa 3 (interface de consulta) implementada em 07/11/2026 em `frontend/`, com 18 testes, typecheck e build aprovados; AC10 e integração PostgreSQL ainda pendentes. Consultar evidências na spec.

## 1. Resolver decisões de preparação

- Contratos da spec, inclusive paginação, filtros e preços: aprovados pelo usuário em 29/10/2026.
- Escolher tecnologia frontend considerando uso interno e ausência de requisito de indexação, sem antecipar instalação.
- Destino escolhido: raiz Git em `cars/`, com `backend/` e `frontend/`. Revisar o [plano de reorganização](repository-plan.md) e a movimentação de metadados foi autorizada e executada sem commits; consultar evidências e pendência das Skills no plano de reorganização. Preservar histórico e arquivos locais; não executar comandos destrutivos automaticamente.
- Definir runtime e ferramentas de testes/checks necessários. Instalações, configuração de CI e mudanças estruturais devem ter escopo explícito.

## 2. Entregar leitura paginada no backend

- Acrescentar schemas de query/identificador e representação dos novos endpoints.
- Acrescentar métodos de repositório para filtros parametrizados, contagem, paginação e detalhe por UUID, sem alterar comportamento da busca IA existente.
- Acrescentar service, controller e rotas GET com erros seguros.
- Validar AC01–AC04, AC08, AC09 e AC11. Integração SQL requer PostgreSQL isolado; se indisponível, registrar a pendência em vez de consultar banco configurado em `.env`.

## 3. Entregar interface de consulta

- Criar aplicação frontend somente após definir localização e tecnologia.
- Implementar cliente HTTP, listagem, filtros na URL, detalhes e navegação.
- Tratar preço BRL, campos nullable, imagens e estados assíncronos.
- Validar AC05–AC07 e AC10 com API controlada nos testes.

## 4. Revisar e registrar

- Executar typecheck e builds das partes alteradas, com comandos definidos na implementação. Build escreve artefatos; não inicia serviços por si só.
- Executar testes pertinentes sem chamadas reais à OpenAI e sem banco de produção.
- Atualizar documentação de desenvolvimento/arquitetura e registrar evidências por critério.
- Revisar exposição das rotas existentes antes de qualquer disponibilização compartilhada. Deploy e autenticação não estão autorizados por este plano.

Não há comandos de instalação, migração, reorganização do Git ou deploy para executar nesta fase de especificação.

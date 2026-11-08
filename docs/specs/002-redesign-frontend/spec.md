# 002 — Redesign do frontend

Status: aprovada e implementada em 07/11/2026 (ver “Decisões pendentes e aprovação” e “Evidências da entrega”). Todos os critérios obrigatórios validados; sem teste com leitor de tela real. A aprovação desta spec autoriza apenas mudanças em `frontend/` (código, testes e documentação) e na documentação do projeto; não autoriza mudanças no backend, novas dependências fora das decisões abaixo, commits ou deploy.

## Problema e objetivo

A interface de consulta da [spec 001](../001-catalogo-web/spec.md) funciona e passou nos critérios de acessibilidade básicos (AC10), mas tem visual genérico, sem tema escuro, e alguns pontos de usabilidade medidos na auditoria abaixo: foco perdido na paginação, rolagem perdida ao voltar dos detalhes, lista longa no celular e detalhes subaproveitando a tela.

Objetivo: aplicar um sistema visual próprio ([frontend/DESIGN.md](../../../frontend/DESIGN.md), adaptado de [linear-reference.md](../../../frontend/design/linear-reference.md)) com tema claro e escuro, e corrigir os problemas de usabilidade listados, **sem mudar contratos da API** nem o comportamento funcional já aprovado na spec 001 (filtros na URL, busca só ao submeter, estados vazios distintos, retorno preservando filtros e página).

## Comportamento atual e evidências

### Auditoria de código (web-design-guidelines)

Executada em 07/11/2026 com a cópia fixada em `.claude/skills/web-design-guidelines/guidelines.md`, sobre `frontend/index.html` e `frontend/src/**/*.{tsx,css}`. Regras de hidratação/SSR e de caixa de título em inglês não se aplicam.

```text
## frontend/index.html
index.html:5   - sem <meta name="theme-color">; sem color-scheme

## frontend/src/styles/global.css
global.css:2   - cores fixas, sem tokens nem tema escuro
global.css:2   - sem touch-action: manipulation / tap-highlight intencional
global.css:6   - .button sem min-height; altura depende de padding e fonte (hoje ≥ 44px por acaso)
global.css:4   - foco global ok (:focus-visible com outline 3px); será trocado pelo token focus

## frontend/src/app/routes.tsx
routes.tsx:5   - NotFoundPage sem estilo de estado e sem document.title próprio
routes.tsx     - sem link "pular para o conteúdo"

## frontend/src/components/States.tsx
States.tsx:4   - "Carregando..." → "Carregando…"
States.tsx:24  - erro (role=alert) visualmente idêntico a vazio (mesma borda tracejada)

## frontend/src/components/CarImage.tsx
CarImage.tsx:18 - <img> sem width/height (aspect-ratio no CSS reduz CLS, mas atributos faltam)
CarImage.tsx:22 - todos os cards com loading=lazy, inclusive a primeira linha visível

## frontend/src/features/catalog/CatalogFilters.tsx
CatalogFilters.tsx:28,32,36 - inputs sem autocomplete="off" e spellCheck={false}; sem placeholder de exemplo
CatalogFilters.module.css:4 - input com 42px de altura (< 44px em toque)

## frontend/src/features/catalog/CatalogPage.tsx
CatalogPage.tsx:46 - "Carregando veículos..." → "…"
CatalogPage.tsx:46 - carregamento substitui a grade inteira (salto de layout, resultado anterior some)
CatalogPage.tsx:94 - contagem de resultados só aparece no rodapé, junto da paginação

## frontend/src/features/catalog/CarCard.tsx / .module.css
CarCard.module.css:3 - título sem truncamento (marcas/modelos longos quebram a grade)
CarCard.module.css:5 - hover só sublinha o título; área clicável limitada ao texto do título
CarCard.module.css:7 - preço sem font-variant-numeric: tabular-nums

## frontend/src/features/catalog/CarDetailsPage.tsx
CarDetailsPage.tsx:50 - "Carregando veículo..." → "…"
CarDetailsPage.tsx:63,88 - h1 genérico "Detalhes do veículo"; nome do veículo em h2
CarDetailsPage.tsx:65-68 - Marca e Modelo repetem o título
CarDetailsPage.module.css:1 - artigo limitado a 640px; em 1280px metade da tela fica vazia

## frontend/src/features/catalog/Pagination.tsx
Pagination.tsx:14 - contagem sem tabular-nums

## frontend/src/features/catalog/format.ts
✓ pass (Intl.NumberFormat para preço e quilometragem)
```

### Auditoria no navegador (playwright-cli)

Executada em 07/11/2026 com `playwright-cli` 0.1.23 (global, fora das dependências do projeto), Chromium, contra o Vite em porta temporária 5191 e uma API simulada em 3334 com 14 veículos fictícios (inclui `null`, quilometragem 0, versão longa e imagem quebrada). Sem banco, sem OpenAI, sem tocar os servidores já em execução em 3333 e 5173. Scripts e capturas ficaram no diretório temporário da sessão e não foram versionados.

| Verificação | 360 px | 768 px | 1280 px |
|---|---|---|---|
| Rolagem horizontal | não | não | não |
| Altura do catálogo (12 cards) | 4945 px (6,3 telas) | 2668 px | 1299 px |
| Posição da paginação | 4826 px | 2609 px | 1240 px |
| Topo do primeiro card | 409 px | 250 px | 194 px |
| Alvos < 44 px | 3 inputs (42 px) | idem | idem |
| `<img>` sem `width` | 7 de 7 | idem | idem |

Comportamentos observados:

- **Tema escuro inexistente:** com `prefers-color-scheme: dark` emulado, o fundo continua `rgb(243, 244, 246)`; `color-scheme` é `normal`; não há `theme-color`.
- **Foco perdido na paginação:** após "Próxima" acionada por teclado, `document.activeElement` passa a ser `BODY`, porque a paginação é desmontada durante o carregamento.
- **Rolagem perdida:** no celular, rolar até o 10º card (3554 px), abrir os detalhes e voltar (pelo link ou pelo botão do navegador) retorna ao topo (0 px).
- **Título da aba fixo:** detalhes também exibem "Catálogo de veículos".
- **Carregamento:** a grade some e dá lugar a uma caixa "Carregando veículos..."; o botão Buscar fica desabilitado sem indicar a busca em andamento.
- **Contraste atual:** metadados e versão com 7,56:1 — aprovado.

Fatos de contrato que limitam o redesign (código atual): o frontend usa apenas `GET /cars` (`page`, `pageSize`, `brand`, `model`, `version`) e `GET /cars/:id` ([client.ts](../../../frontend/src/api/client.ts)); a API não oferece ordenação, filtros de ano/preço/quilometragem nem lista de marcas.

## Escopo e fora do escopo

Inclui:

- Tokens de design e temas claro/escuro conforme [frontend/DESIGN.md](../../../frontend/DESIGN.md).
- Barra superior com nome do catálogo e seletor de tema.
- Restyle de filtros, cards, estados, paginação, detalhes e página não encontrada.
- Melhorias de usabilidade U01–U16 abaixo.
- Atualização e criação de testes Vitest; atualização de `frontend/README.md` e evidências desta spec.

Fora do escopo:

- Qualquer mudança no backend, em contratos HTTP, em `PAGE_SIZE` (12) ou na semântica da query string.
- Novos filtros (ano, preço, quilometragem, combustível), ordenação, autocomplete de marcas, busca por IA, cadastro, favoritos, comparação — todos dependem de API ou decisão de produto.
- Ícones de bibliotecas externas, fontes remotas, frameworks CSS. Playwright como dependência do projeto (continua adiado).

## Melhorias de usabilidade

Prioridade: **P1** corrige problema medido; **P2** melhora clara de fluxo; **P3** acabamento.

| ID | Prioridade | Melhoria | Problema que resolve | Contrato afetado |
|---|---|---|---|---|
| U01 | P1 | Tema claro/escuro seguindo o sistema, com preferência manual (ver D1) | Sem tema escuro; ofuscamento em ambiente escuro | Nenhum |
| U02 | P1 | Manter foco após paginação: mover foco para o resumo de resultados (ou título da lista) com `tabindex="-1"` e rolar ao topo da lista | Foco cai em `BODY` após Próxima/Anterior | Nenhum |
| U03 | P1 | Restaurar rolagem ao voltar dos detalhes (`ScrollRestoration` do React Router, chaveado pela URL do catálogo) | Volta ao topo após abrir o 10º card | Nenhum |
| U04 | P1 | `document.title` por página, incluindo marca, modelo e ano nos detalhes | Abas e histórico indistinguíveis | Nenhum |
| U05 | P1 | Manter a grade anterior visível e esmaecida (`aria-busy`) durante trocas de página/filtro; skeleton só no primeiro carregamento; botão mostra "Buscando…" | Grade some e layout salta a cada busca | Nenhum |
| U06 | P2 | Resumo acima da grade com contagem ("14 veículos", `aria-live`) e chips dos filtros aplicados, cada um removível | Contagem só no rodapé; filtros ativos pouco visíveis após rolar | Nenhum (chips só reescrevem a query string existente) |
| U07 | P2 | Card inteiro clicável, com hover e foco no card | Área clicável limitada ao título | Nenhum |
| U08 | P2 | Lista mais curta no celular: card compacto horizontal abaixo de 480 px ou imagem menor, com meta de altura (AC07) | 6,3 telas até a paginação em 360 px | Nenhum |
| U09 | P2 | Detalhes em duas colunas ≥ 1024 px; nome do veículo como `h1`; preço em destaque; sem repetir marca/modelo na lista | Página subaproveitada; `h1` genérico | Nenhum |
| U10 | P2 | Erro visualmente distinto (borda/título `danger`) dos estados vazios | Erro e vazio idênticos | Nenhum |
| U11 | P2 | Alvos ≥ 44 px em toque (inputs, botões, chips, seletor de tema) | Inputs com 42 px | Nenhum |
| U12 | P2 | Link "Pular para o conteúdo" e `main` com id | Sem skip link (passa a existir barra superior) | Nenhum |
| U13 | P3 | Placeholders de exemplo ("Ex.: Toyota…"), `autocomplete="off"`, `spellCheck={false}` nos filtros | Campos sem pista de formato | Nenhum |
| U14 | P3 | Reticências tipográficas, `tabular-nums` em preço/contagem/paginação, título truncado no card | Acabamento e alinhamento numérico | Nenhum |
| U15 | P3 | `width`/`height` nas imagens; `loading="eager"` na primeira linha do catálogo e na imagem dos detalhes | Imagens sem dimensões; primeira dobra com lazy | Nenhum |
| U16 | P3 | Página não encontrada com o mesmo painel de estado e ação para o catálogo | Página crua | Nenhum |

Avaliadas e não incluídas: botão Limpar desabilitado sem filtros (pouco ganho, muda comportamento testado); paginação numérica (exige decisão de produto sobre muitas páginas; Anterior/Próxima atende); filtro aplicado a cada tecla (proibido pela spec 001).

## Comportamento proposto e cenários

- **Tema:** sem preferência gravada, segue o sistema e reage a mudanças dele. Com preferência, aplica-a antes da primeira pintura. `localStorage` indisponível → tema do sistema, sem erro.
- **Paginação:** Próxima/Anterior atualizam a URL como hoje; a grade anterior fica esmaecida até a resposta; ao chegar, o foco vai para o resumo de resultados e a lista volta ao topo.
- **Busca e chips:** Buscar e Limpar mantêm o comportamento atual (página 1). Remover um chip equivale a aplicar os filtros restantes na página 1. Os campos do formulário refletem a URL, como hoje.
- **Detalhes e retorno:** o retorno por "Voltar ao catálogo" e pelo histórico restaura filtros, página e posição de rolagem quando o catálogo estiver na mesma URL.
- **Erros:** respostas antigas continuam descartadas; erro durante troca de página mostra o painel de erro no lugar da grade esmaecida, com "Tentar novamente".
- **Movimento reduzido:** sem transições nem pulso do skeleton.

## Contratos da API e dados

Nenhuma mudança. O frontend continua usando somente `GET /cars` com `page`, `pageSize=12`, `brand`, `model`, `version` e `GET /cars/:id`, com os tipos de [types.ts](../../../frontend/src/api/types.ts). A query string do catálogo (`brand`, `model`, `version`, `page`) mantém nomes e regras. Preferência de tema fica só no navegador (`localStorage`, chave proposta `catalog-theme`), sem dado pessoal. Sem schema, migration ou alteração no backend.

## Interface

Regras visuais, tokens, componentes e responsividade estão em [frontend/DESIGN.md](../../../frontend/DESIGN.md). Navegação continua: `/` → `/cars`, `/cars`, `/cars/:id`, `*`.

## Segurança e serviços externos

Sem novas requisições externas por padrão (fontes e ícones locais ou do sistema). O script inline de tema em `index.html` lê apenas `localStorage` e define um atributo; se houver CSP futura, ele precisará de hash. Sem OpenAI, banco, credenciais ou dados de produção nos testes.

## Critérios de aceite

| ID | Resultado verificável | Validação |
|---|---|---|
| AC01 | Contratos inalterados: só GETs para `/cars` e `/cars/:id` com os mesmos parâmetros; nenhuma mudança em `backend/` | Testes existentes de requisição; `git diff --stat backend/` vazio |
| AC02 | Comportamentos da spec 001 preservados (URL, busca ao submeter, três estados vazios, erro com retry, voltar com filtros, 404) | Os 18 testes existentes passam, ajustados só em seletores/textos alterados |
| AC03 | Tema segue o sistema; preferência manual persiste após recarga; sem piscar tema errado; `localStorage` com erro cai no sistema | Testes Vitest do hook/componente de tema; playwright-cli com `set-color-scheme` e recarga |
| AC04 | Todos os pares de texto dos dois temas atendem à tabela de contraste do DESIGN.md (≥ 4,5:1 texto, ≥ 3:1 controles/foco) | Script de contraste sobre os estilos computados no navegador, nos dois temas |
| AC05 | Após Próxima/Anterior por teclado, o foco fica no resumo de resultados, não em `BODY` | Teste Vitest + playwright-cli |
| AC06 | Voltar dos detalhes (link e histórico) restaura a rolagem do catálogo com tolerância de 50 px | playwright-cli em 360 px |
| AC07 | Em 360 px, a paginação aparece a no máximo 3500 px do topo com 12 cards (hoje 4826 px); sem rolagem horizontal em 360/768/1280 nos dois temas | playwright-cli |
| AC08 | `document.title` correto nas três páginas | Testes Vitest |
| AC09 | Durante troca de página/filtro, resultados anteriores permanecem visíveis com `aria-busy="true"`; primeiro carregamento mostra skeleton; botão mostra "Buscando…" | Testes Vitest com `fetch` controlado |
| AC10 | Chips refletem os filtros da URL; remover um chip refaz a busca sem aquele filtro, na página 1 | Testes Vitest |
| AC11 | Alvos interativos ≥ 44 px sob ponteiro grosso; skip link funcional; um `h1` por página (nome do veículo nos detalhes) | playwright-cli com emulação móvel + testes Vitest |
| AC12 | Auditoria web-design-guidelines refeita sem os achados listados acima (ou com justificativa registrada) | Nova auditoria registrada nas evidências |
| AC13 | `prefers-reduced-motion: reduce` remove transições e pulso | playwright-cli `set-reduced-motion` + estilos computados |
| AC14 | Typecheck e build aprovados; sem novas dependências além das decididas em D2 | `npm run typecheck`, `npm run build`, diff de `package.json` |

## Plano e validação

Ordem proposta, cada passo validado antes do próximo:

1. **Tokens e temas:** variáveis em `global.css`, script de tema em `index.html`, `theme-color`, hook `useTheme` em `src/app/` e seletor na barra superior (novo `src/components/TopBar.tsx`). Converter todos os CSS Modules para tokens, sem mudar layout. Testes do tema.
2. **Estrutura e acessibilidade:** layout raiz com barra superior, skip link e `main#conteudo`; `document.title` por página; `ScrollRestoration`; foco pós-paginação.
3. **Catálogo:** painel de filtros, resumo com chips, card clicável e compacto no celular, skeleton e grade esmaecida, estados com erro distinto, paginação.
4. **Detalhes e 404:** layout em duas colunas, `h1` com o veículo, lista sem repetição, página não encontrada.
5. **Validação:** typecheck, testes, build; auditoria playwright-cli repetida com a mesma API simulada (dados fictícios, portas temporárias, sem banco/OpenAI) nos dois temas e três larguras; nova passagem web-design-guidelines; atualização de `frontend/README.md` e das evidências.

Efeitos dos comandos: `npm test` e `npm run typecheck` não escrevem arquivos; `npm run build` escreve `frontend/dist/` (ignorado). A auditoria sobe processos temporários locais e grava capturas fora do repositório. Nenhum comando toca banco, OpenAI ou o backend.

## Decisões pendentes e aprovação

| ID | Decisão | Recomendação |
|---|---|---|
| D1 | Seletor manual de tema (Sistema/Claro/Escuro com `localStorage`) ou apenas seguir o sistema | Seletor manual: uso interno em máquinas compartilhadas e testes visuais mais simples |
| D2 | Fonte: pilha do sistema ou Inter auto-hospedada (`@fontsource-variable/inter`, nova dependência ~50 KB woff2) | Pilha do sistema: zero dependência; Inter pode vir depois sem mudar tokens |
| D3 | Card compacto horizontal abaixo de 480 px (U08) ou apenas imagem menor | Card compacto: maior redução de altura; aceito se AC07 for atingido de outra forma |
| D4 | Implementação por subagente `executor` (Sonnet) com revisão final no modelo principal, conforme [workflow-ia.md](../../workflow-ia.md) | Sim, em passos 1–4 separados |

Aprovação: em 07/11/2026, pela mensagem “Podemos seguir”, após a apresentação desta spec com as recomendações acima. Decisões adotadas: D1 seletor manual; D2 pilha do sistema, sem nova dependência; D3 card compacto abaixo de 480 px. D4: a implementação foi feita no modelo principal, que já tinha o contexto das auditorias, seguindo a mesma ordem de passos (mudança de processo, não de escopo). Escopo aprovado: somente `frontend/` e documentação; sem backend, commits ou deploy.

## Evidências da entrega

Implementada em 07/11/2026, somente em `frontend/` e documentação. Sem novas dependências, sem mudança em `backend/` e sem commits.

Arquivos novos: `src/app/theme.ts`, `src/app/documentTitle.ts`, `src/components/TopBar.tsx` (+ CSS), `src/features/catalog/ResultsBar.tsx` (+ CSS), `tests/redesign.test.tsx`. Alterados: `index.html`, `src/styles/global.css`, `src/app/routes.tsx`, componentes e CSS Modules do catálogo, `format.ts` (`formatCount`), testes de catálogo/detalhes e `tests/setup.ts` (stub de `window.scrollTo` para jsdom).

Comandos executados em `frontend/`: `npm run typecheck` sem erros; `npm test` com 29 testes em 4 arquivos aprovados, sem avisos no stderr; `npm run build` aprovado (CSS 13,5 kB, JS 333 kB / 105 kB gzip). `git diff --stat -- backend/` vazio.

Auditoria no navegador repetida com `playwright-cli` 0.1.23 e a mesma API simulada (portas temporárias 3334, 5191 e 5192 para o build de produção; dados fictícios; sem banco nem OpenAI; processos encerrados ao final; scripts e capturas fora do repositório).

| Critério | Resultado |
|---|---|
| AC01 | Somente GETs para `/cars` e `/cars/:id` com os mesmos parâmetros (teste existente de método e query); `backend/` sem diff |
| AC02 | Os 18 testes originais passam. Ajustes só de texto/seletor: contagem "30 veículos" em vez de "30 resultados" (agora no resumo), botão "Buscando…" durante carga, `h1` nos detalhes em vez de `h2`, primeira linha com `loading="eager"` |
| AC03 | Testes: padrão Sistema, escolha persiste e é restaurada, `localStorage` com erro não quebra. Navegador: após escolher Escuro, `data-theme="dark"` e metas `theme-color` atualizadas; no build de produção com todo o JS bloqueado, a página já carrega com `data-theme="dark"`, fundo `rgb(1, 1, 2)` e `color-scheme: dark` (sem piscar) |
| AC04 | Contraste medido nos estilos computados, iguais nos três tamanhos de tela. Claro: título 17,9; rótulo/versão/metadados 5,95; contagem e paginação 5,59; botão principal 4,7; bordas de input e botão secundário 3,25; foco 4,42. Escuro: 19,61; 5,86; 6,42; 4,7; 3,3; foco 7,27 |
| AC05 | Teste Vitest e navegador: após Próxima por teclado, foco em `P: "14 veículos"`, com `:focus-visible` |
| AC06 | 360 px: rolagem 1184 px antes de abrir os detalhes, 1184 px ao voltar pelo link e 1184 px pelo botão voltar (antes: 0) |
| AC07 | 360 px: paginação a 1978 px (antes 4826 px; limite 3500). Sem rolagem horizontal em catálogo e detalhes, nas três larguras e nos dois temas |
| AC08 | Testes: "Catálogo de veículos", "Toyota Corolla 2020 · Catálogo de veículos", "Página não encontrada · Catálogo de veículos". Navegador: "Honda Civic 2021 · Catálogo de veículos" |
| AC09 | Teste com `fetch` pendente: card anterior dentro de `aria-busy="true"` e botão "Buscando…" desabilitado; skeleton com `role="status"` no primeiro carregamento. Navegador: a largura dos campos não muda entre "Buscar" e "Buscando…" (297,45 px nos dois) |
| AC10 | Teste: chips "Marca: Toyota" e "Modelo: Cor"; remover a marca leva a `?model=Cor` e a uma requisição sem `brand`, na página 1 |
| AC11 | Com emulação de toque (360 e 768 px), nenhum controle abaixo de 44 px. Em 1280 px sem toque, 40 px (como prevê o DESIGN.md). Primeiro Tab leva a "Pular para o conteúdo"; Enter move o foco para `#conteudo`. Um `h1` por página |
| AC12 | Nova passagem web-design-guidelines sem os achados da auditoria inicial. Os `outline: none` restantes têm substituto (anel no card via `:focus-within`; `main` com `:focus-visible`). `-webkit-tap-highlight-color` mantido padrão, como define o DESIGN.md |
| AC13 | Com `reducedMotion: reduce`: animação do skeleton `none` e transição do botão `0s`; sem a emulação, pulso ativo e transição de 0,12 s |
| AC14 | Typecheck e build aprovados; `package.json` e `package-lock.json` sem alteração |

Ajustes feitos durante a validação: largura mínima no botão de busca (evita deslocar os campos) e nome curto "Catálogo" na barra abaixo de 400 px, mantendo o rótulo acessível completo, para o seletor de tema caber na mesma linha (barra com 67 px em 360 px).

Limitações: sem teste com leitor de tela real nem em Safari/Firefox (só Chromium); auditoria com API simulada, não com o backend real; a restauração de rolagem depende de o skeleton ter altura próxima à dos cards, e pode ficar imprecisa quando a página tiver menos de 12 resultados. Playwright continua fora das dependências do projeto.

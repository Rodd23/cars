# Especificação: refinamento visual do frontend com Tailwind e shadcn/ui

Status: implementada em 07/11/2026 (aprovada na mesma data). Mockup aprovado pelo usuário em 07/11/2026 ([mockup.html](mockup.html)).

## Problema e objetivo

A interface do catálogo (spec 002) é correta e acessível, mas contida demais. O usuário quer um visual mais atrativo e moderno, sem trocar a identidade. Objetivo: aplicar o refinamento do mockup às quatro telas (catálogo, detalhes, login e cadastro) e migrar a estilização de CSS Modules para Tailwind CSS v4 com componentes shadcn/ui. Funcionalidades, contratos da API e textos atuais continuam iguais, salvo as mudanças listadas abaixo.

## Comportamento atual e evidências

- Estilos em CSS Modules por componente (`frontend/src/**/*.module.css`) e tokens em `frontend/src/styles/global.css`, descritos em `frontend/DESIGN.md`.
- O DESIGN.md proíbe sombras e restringe a lavanda (`primary`) a ação principal, link, foco e seleção.
- O placeholder usa `ink-tertiary`, com contraste de 3,25:1 (abaixo de 4,5:1). O detector da impeccable confirmou no mockup.
- Tema: grupo de três botões (Sistema, Claro, Escuro) sempre visível na barra superior (`TopBar.tsx`).
- Filtros: painel com sete campos, botões "Buscar" e "Limpar" (`CatalogFilters.tsx`).
- Paginação: apenas "Anterior" e "Próxima" com "Página X de Y" (`Pagination.tsx`).
- Card: título, versão, preço com centavos, ano e quilometragem (`CarCard.tsx`); combustível e câmbio só aparecem nos detalhes.
- Cadastro: combustível e câmbio aceitam texto livre com sugestões (`datalist`); há pré-visualização só da imagem (`CarFormPage.tsx`).
- Dependências de UI: nenhuma (`frontend/package.json`).

## Escopo e fora do escopo

Inclui:

- Tailwind CSS v4 (`@tailwindcss/vite`) e componentes shadcn/ui copiados para `frontend/src/components/ui/`.
- Refinamento visual das quatro telas, da barra superior e dos estados (carregamento, vazio, erro).
- As mudanças de comportamento listadas em "Comportamento proposto".
- Remoção de todos os arquivos `.module.css` ao final.
- Reescrita do `frontend/DESIGN.md` e atualização de testes, READMEs e `docs/architecture.md`.

Fora do escopo: backend e contratos da API, edição e exclusão de veículos, fonte própria (continua a pilha do sistema), novas rotas, ordenação de resultados e upload de imagem.

## Comportamento proposto e cenários

### Mantido

- Rotas, consultas, URL como fonte dos filtros, paginação por `page`, mensagens de erro e validações do cadastro e do login.
- Paleta e contraste do DESIGN.md, temas claro e escuro, preferência em `localStorage` (`catalog-theme`) e script anti-piscar em `index.html`.
- Link "Pular para o conteúdo", um `h1` por página, `document.title` por página, foco após paginar e resultados anteriores esmaecidos durante nova consulta.
- Card compacto horizontal abaixo de 480 px.

### Mudanças visuais

1. **Elevação:** sombra suave (com deslocamento e desfoque) em card no hover, busca inteligente, popovers e menus.
2. **Lavanda suave:** `primary` a 11% (claro) e 16% (escuro) como fundo de filtro ativo, chip e avatar, com texto `primary-soft-ink` (contraste ≥ 4,5:1).
3. **Ícones Lucide** (`lucide-react`) em metadados, ações e trilha, sempre com `aria-hidden` e rótulo textual.
4. **Placeholders** em `ink-subtle` (5,9:1 claro e escuro), corrigindo o contraste.
5. **Card:** foto 4:3, zoom leve na foto e elevação no hover; preço sem centavos (`R$ 189.900`); linha de metadados com ano, quilometragem, combustível e câmbio, cada um omitido quando nulo.
6. **Detalhes:** foto grande com raio de 16 px; título de 30 a 36 px; preço de 34 a 40 px com centavos; ficha em grade 2 × 2 com ícones (Ano, Quilometragem, Combustível, Câmbio); versão abaixo do título; "Cadastrado em" e "atualizado em" com as datas de `createdAt` e `updatedAt`. Campos nulos continuam "Não informado"/"Não informada". "Voltar ao catálogo" vira trilha "← Catálogo › Marca Modelo", preservando o retorno com filtros e página.

### Mudanças de comportamento

1. **Busca inteligente em destaque:** campo de 64 px no topo do catálogo (só com sessão, como hoje), com três sugestões clicáveis que preenchem o campo sem enviar. A tecla `/` foca o campo quando o foco não está em um campo de texto. Avisos "Entendi"/"Ignorado" e erros continuam iguais.
2. **Filtros:** Marca, Modelo e Versão continuam campos visíveis (Versão a partir de 1024 px; abaixo disso, dentro de um popover "Mais filtros"). Ano (mínimo e máximo), Quilometragem (máxima) e Preço (máximo) vão para popovers. O botão de cada popover mostra o valor ativo ("Ano: 2019–2022"), em lavanda suave quando há valor. Os popovers têm atalhos de valor (km: 20, 50 e 100 mil; preço: R$ 80, 150 e 250 mil). O envio do formulário continua aplicando todos os filtros de uma vez e o botão passa de "Buscar" para **"Filtrar"**, para não se confundir com a busca inteligente. A validação de faixa atual é mantida e o erro aparece dentro do popover correspondente, que abre sozinho.
3. **Limpar:** o botão "Limpar" do formulário sai; a linha de resultados ganha "Limpar filtros" ao lado dos chips quando há filtros aplicados. O estado vazio continua com seu próprio "Limpar filtros".
4. **Paginação numerada:** "Anterior", números de página e "Próxima". Com mais de 7 páginas, mostra a primeira, a última, a atual e suas vizinhas, com reticências. Página atual com `aria-current="page"`.
5. **Tema e sessão:** com sessão, um menu do usuário (avatar com iniciais e nome) reúne nome, e-mail, seletor de tema (Sistema, Claro, Escuro, com `aria-pressed`) e "Sair". Sem sessão, um botão de ícone "Tema" abre o mesmo seletor; "Entrar" continua visível. "Novo veículo" continua na barra.
6. **Login:** a partir de 1024 px, tela dividida com foto à esquerda (asset local em `frontend/public/`) e formulário à direita, sem a barra superior; abaixo disso, só o formulário com a marca. Botão para mostrar/ocultar a senha (`aria-label` alternando entre "Mostrar senha" e "Ocultar senha"). "Voltar ao catálogo" abaixo do formulário.
7. **Cadastro:** campos em três seções (Identificação; Especificações; Preço e foto). **Combustível e câmbio viram opções fixas** em grupo de alternância de seleção única (Flex, Gasolina, Etanol, Diesel, Elétrico, Híbrido; Manual, Automático, CVT), ainda obrigatórias, com a mesma mensagem de erro. Preço e quilometragem formatam milhares enquanto se digita e enviam só dígitos. Ao lado (abaixo em telas estreitas), "Como vai aparecer no catálogo" mostra o card real atualizado ao vivo, substituindo a pré-visualização só da imagem. Barra de ações fixa no rodapé com "Cancelar" e "Cadastrar veículo".

### Casos limite

- Card sem versão mantém a altura; sem imagem mostra "Sem imagem"; metadado nulo é omitido.
- Valores longos (versão, marca) usam reticências no card e quebram nos detalhes.
- Popover fecha com Esc e clique fora, devolvendo o foco ao botão; não é cortado por contêiner com `overflow` (Radix usa portal).
- Uma só página: paginação continua visível com "Página 1 de 1" e botões desabilitados, como já era antes desta spec (texto corrigido em 07/11/2026; a versão anterior desta linha dizia, por engano, que ela sumia).
- `prefers-reduced-motion: reduce` remove zoom, elevação animada e pulso do skeleton.

## Contratos da API e dados

Sem mudança. As opções fixas de combustível e câmbio são restrição só do formulário; o backend continua aceitando texto de até 30 caracteres, e veículos existentes com outros valores são exibidos normalmente.

## Interface

| Faixa | Grade | Filtros | Detalhes | Login |
|---|---|---|---|---|
| < 480 px | 1 coluna, card compacto | Marca e Modelo lado a lado; popovers abaixo; Filtrar em largura total | 1 coluna | só formulário |
| 480–767 px | 2 colunas | idem | 1 coluna | só formulário |
| 768–1023 px | 3 colunas | uma linha com quebra | 1 coluna | só formulário |
| ≥ 1024 px | 4 colunas | uma linha | 2 colunas, resumo fixo ao rolar | dividido com foto |

Acessibilidade: AA em todo texto (incluindo placeholders), foco visível de 2 px nos componentes shadcn (sobrescrevendo o anel padrão deles pelo token `ring`), alvos ≥ 44 px sob `pointer: coarse`, popovers e menus com o comportamento de teclado do Radix, sem rolagem horizontal em 360, 768 e 1280 px.

## Segurança e serviços externos

Nenhum serviço novo em tempo de execução. Ícones e componentes são empacotados no build. A foto do login é um arquivo local baixado do Unsplash (Licença Unsplash, uso livre), com a origem registrada no README do frontend. O mockup usa CDNs, mas a aplicação não.

### Dependências novas (justificativa)

| Pacote | Motivo |
|---|---|
| `tailwindcss`, `@tailwindcss/vite` | Estilização escolhida pelo usuário |
| `radix-ui` | Base acessível do shadcn para Popover, DropdownMenu e ToggleGroup |
| `class-variance-authority`, `clsx`, `tailwind-merge` | Variantes e composição de classes dos componentes shadcn |
| `lucide-react` | Ícones |

Os componentes shadcn são copiados para o repositório (sem pacote `shadcn` em runtime) e adaptados às convenções: imports relativos com `.js`, sem alias `@/`, TypeScript estrito.

## Critérios de aceite

| # | Critério | Validação |
|---|---|---|
| AC1 | Tailwind v4 e componentes shadcn em `src/components/ui/`; nenhum `.module.css` restante | Build; busca por `.module.css` |
| AC2 | Tokens atuais preservados e mapeados no `@theme`; temas claro, escuro e sistema funcionando | Teste de tema; capturas nos dois temas |
| AC3 | Placeholders ≥ 4,5:1 e nenhum apontamento de contraste | `impeccable detect` na página renderizada |
| AC4 | Card mostra combustível e câmbio quando existem, preço sem centavos e omite nulos | Teste de componente |
| AC5 | Busca inteligente: sugestão preenche sem enviar; `/` foca; fluxo e erros iguais aos atuais | Testes da busca inteligente atualizados |
| AC6 | Filtros de faixa em popover, com valor ativo no botão, atalhos, erro de validação no popover e envio por "Filtrar" | Testes de filtros atualizados |
| AC7 | "Limpar filtros" na linha de resultados remove todos os filtros na página 1 | Teste de catálogo |
| AC8 | Paginação numerada com reticências acima de 7 páginas e `aria-current` | Teste unitário do cálculo das páginas e teste de catálogo |
| AC9 | Tema no menu do usuário (com sessão) ou no botão de ícone (sem sessão), persistido como hoje | Testes de tema e de sessão atualizados |
| AC10 | Login dividido a partir de 1024 px, mostrar/ocultar senha, mesmos erros e redirecionamento | Testes de login; captura |
| AC11 | Cadastro com seções, opções fixas obrigatórias, formatação de milhares enviando só dígitos e pré-visualização ao vivo | Testes de cadastro atualizados |
| AC12 | Detalhes com trilha que restaura filtros e página, ficha 2 × 2 e "Não informado" para nulos | Testes de detalhes |
| AC13 | Sem rolagem horizontal em 360, 768 e 1280 px; reduced-motion respeitado | Capturas com Playwright e API simulada |
| AC14 | `typecheck`, `test` e `build` do frontend passam; testes do backend intactos | Validador |
| AC15 | DESIGN.md reescrito com os novos tokens (sombra, lavanda suave) e regras; READMEs e arquitetura atualizados | Revisão dos documentos |

## Plano e validação

Ordem de implementação (cada etapa termina com typecheck e testes verdes):

1. **Fundação:** instalar dependências; `@tailwindcss/vite` no `vite.config.ts`; `global.css` vira entrada Tailwind com `@theme inline` mapeando os tokens atuais e os novos (`primary-soft`, `primary-soft-ink`, `shadow-lift`, `shadow-pop`); `cn()` em `src/lib/cn.ts`; componentes shadcn (Button, Input, Label, Badge, Popover, DropdownMenu, ToggleGroup, Skeleton) adaptados às convenções.
2. **Barra superior e tema:** TopBar com menu do usuário e botão de tema.
3. **Catálogo:** SmartSearch, CatalogFilters com popovers, ResultsBar com "Limpar filtros", CarCard, Pagination numerada e estados.
4. **Detalhes.**
5. **Login** e asset da foto.
6. **Cadastro.**
7. **Limpeza:** remover `.module.css` restantes e estilos mortos.
8. **Verificação visual:** capturas em 360, 390, 768, 1280 e 1440 px, nos dois temas, com Playwright e respostas da API simuladas por `page.route` (sem backend e sem banco), mais `impeccable detect` na página renderizada.
9. **Documentação:** DESIGN.md, `frontend/README.md`, `docs/architecture.md`, `docs/development.md` (se comandos mudarem) e evidências nesta spec.

Comandos: `npm install` em `frontend/` (altera `package.json` e `package-lock.json`, baixa pacotes do npm), `npm run typecheck`, `npm test`, `npm run build`. Nenhuma migration, chamada à OpenAI, commit ou deploy.

## Decisões e aprovação

Decididas pelo usuário em 07/11/2026: refinamento ousado em vez de redesign; Tailwind + shadcn/ui; mockup das quatro telas aprovado ("Ok, aprovado"), incluindo opções fixas de combustível e câmbio, sombra e lavanda suave, e fontes do sistema.

Especificação aprovada pelo usuário em 07/11/2026 ("Pode implementar"), para o escopo acima. A aprovação não autoriza commit, deploy, migration nem chamada paga.

## Evidências da entrega

Implementada em 07/11/2026. Resultados por critério:

| AC | Situação | Evidência |
|---|---|---|
| AC1 | Atendido | Tailwind v4 pelo `@tailwindcss/vite` (`frontend/vite.config.ts`); componentes em `frontend/src/components/ui/` (button, input, label, badge, popover, dropdown-menu, toggle-group, skeleton). Busca por `.module` e "CSS Modules" em `frontend/src` sem resultados. Typecheck e build passando. |
| AC2 | Atendido | Tokens em `frontend/src/styles/global.css` (`:root`, temas escuros, `@theme inline`); teste de tema em `frontend/tests/redesign.test.tsx`; capturas nos temas claro e escuro. |
| AC3 | Atendido | Placeholders em `ink-subtle` (5,9:1 nos dois temas). `impeccable detect` sem apontamentos em /cars, /cars/:id, /login e no código-fonte. Um apontamento de contraste da marca sobre a foto do login foi corrigido com degradê no topo. |
| AC4 | Atendido | `CarCard.tsx`: combustível e câmbio, preço sem centavos (`formatPriceWhole`), metadados nulos omitidos. Pré-visualização do cadastro em `frontend/tests/auth.test.tsx`. |
| AC5 | Atendido | `SmartSearch.tsx`: sugestões preenchem sem enviar; tecla `/` foca o campo. Testes em `frontend/tests/smartsearch.test.tsx`. |
| AC6 | Atendido | `CatalogFilters.tsx`: popovers com valor ativo, atalhos, erro no popover e envio por "Filtrar". Testes em `frontend/tests/catalog.test.tsx`. |
| AC7 | Atendido | `ResultsBar.tsx`: "Limpar filtros" aplica `EMPTY_FILTERS` na página 1. Teste em `frontend/tests/catalog.test.tsx`. |
| AC8 | Atendido | `Pagination.tsx` (`pageSequence`, `aria-current`). Testes de sequência e de navegação numérica em `frontend/tests/catalog.test.tsx`. |
| AC9 | Atendido | `TopBar.tsx`: menu do usuário com sessão; botão "Tema" sem sessão. Testes em `frontend/tests/redesign.test.tsx` e `frontend/tests/auth.test.tsx`. |
| AC10 | Atendido | `LoginPage.tsx`: tela dividida em `lg` com `public/login-cover.jpg`; "Mostrar senha"/"Ocultar senha". Teste em `frontend/tests/auth.test.tsx`; captura em 1440 px. |
| AC11 | Atendido | `CarFormPage.tsx`: três seções, `ToggleGroup` com opções fixas, milhares com envio de dígitos, card ao vivo e barra fixa. Testes em `frontend/tests/auth.test.tsx`. |
| AC12 | Atendido | `CarDetailsPage.tsx`: trilha com `location.state`, ficha 2 × 2, "Não informado". Testes em `frontend/tests/details.test.tsx`. |
| AC13 | Parcial | Capturas com Playwright e API simulada por `page.route` em 390, 768 e 1440 px, nos dois temas, com e sem sessão, sem rolagem horizontal. Não capturado em 360 e 1280 px (limitação). Reduced-motion verificado por leitura de `global.css`, não por captura. |
| AC14 | Atendido para o frontend | Typecheck, testes (75) e build do frontend passando em 07/11/2026. Nenhum arquivo de `backend/` foi alterado por esta spec. |
| AC15 | Atendido | `frontend/DESIGN.md` reescrito; `frontend/README.md` e `docs/architecture.md` atualizados em 07/11/2026. |

Validação automatizada: typecheck, testes e build passando em 07/11/2026.

Verificação visual: capturas com Playwright e API simulada por `page.route`, em 390, 768 e 1440 px, nos temas claro e escuro, com e sem sessão, sem rolagem horizontal. `impeccable detect` sem apontamentos em /cars, /cars/:id, /login e no código-fonte.

Desvios em relação ao texto da spec:

- A contagem de veículos fica só na linha de resultados, não ao lado do `h1`.
- Versão nula é omitida nos detalhes, sem linha vazia.
- Os grupos de combustível e câmbio são expostos como `radiogroup` pelo Radix, e não como grupo de botões.
- Campos (`Input` e busca inteligente) usam no foco borda `primary` e anel sólido de 2 px `ring` (em vez do contorno com afastamento). O anel suave de 4 px `primary-soft` da primeira versão foi trocado na revisão por ter contraste insuficiente.
- Com uma única página, a paginação continua visível, como antes da spec; o caso limite da spec foi corrigido para refletir esse comportamento.

Correção pós-entrega (07/11/2026): o seletor de tema estourava o menu ("Escuro" saía do card), pois o menu tinha 240 px. Os menus de tema e do usuário passaram para 288 px e os botões não quebram texto; medido em 360 e 1440 px, com e sem sessão.

Teste manual: o usuário testou o frontend em 08/11/2026 e relatou que está tudo certo.

Limitações:

- O fluxo real contra o backend e o PostgreSQL não foi exercitado; a validação usou API simulada.
- Playwright não está na suíte de testes, e as capturas não foram versionadas.
- O build tem aviso de chunk acima de 500 kB (cerca de 587 kB de JavaScript). O volume vem de react-dom, react-router, zod e tailwind-merge.
- Capturas em 360 e 1280 px não foram feitas (AC13).

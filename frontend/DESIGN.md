# Design do catálogo

Status: implementado em 07/11/2026 pela [spec 005](../docs/specs/005-refinamento-visual/spec.md), refinamento da [spec 002](../docs/specs/002-redesign-frontend/spec.md). Fonte de tokens e regras visuais da interface; os tokens estão em `src/styles/global.css` e são consumidos por classes Tailwind CSS v4 e pelos componentes de `src/components/ui/`. Decisões aplicadas: seletor manual de tema, pilha de fontes do sistema (sem Inter), card compacto abaixo de 480 px, componentes no estilo shadcn/ui e lavanda suave em estados. Alterações visuais devem atualizar este documento.

Origem: adaptação de [design/linear-reference.md](design/linear-reference.md) (VoltAgent Awesome DESIGN.md, MIT). A referência descreve um site de marketing escuro; este documento adapta a linguagem dela a uma ferramenta interna de consulta, com tema claro e escuro.

## Princípios

- **Ferramenta, não vitrine.** Densidade moderada, hierarquia por superfícies e bordas finas. Sombra suave só em elementos de elevação (ver Elevação). Sem gradientes decorativos nem ilustrações. As fotos dos veículos são o destaque visual; a capa da tela de login é a única foto de apoio.
- **Um único acento.** Lavanda (`primary`) só em ação principal, links, foco e item selecionado. Filtro ativo, chip e avatar usam a versão suave (`primary-soft`). Nunca como fundo de card ou de seção.
- **Semântica mínima.** Além do acento, `danger` (erro) e `success` (confirmação, como o aviso "Entendi" e "Veículo cadastrado"). Sem paleta de etiquetas.
- **Dois temas equivalentes.** Todo componente é especificado nos dois temas; nenhum estado existe só em um deles.
- **Contraste verificado.** Texto ≥ 4,5:1, texto grande e bordas de controles ≥ 3:1 (WCAG 2.2 AA). Os valores abaixo foram calculados em 07/11/2026.

## Diferenças em relação à referência

| Referência | Adaptação | Motivo |
|---|---|---|
| Apenas tema escuro ("Don't ship a light mode") | Tema claro e escuro | Requisito da spec 002; uso interno em ambientes variados |
| `primary-hover` #828fff (mais claro) | Hover escurece para #4f5bc4 nos dois temas | Texto branco sobre #828fff fica em ~3:1; sobre #4f5bc4, 5,79:1 |
| Anel de foco a 50% de opacidade | Anel sólido de 2 px com afastamento de 2 px | Opacidade reduz o contraste abaixo de 3:1 no tema claro |
| Borda de input `hairline` (#23252a) | Token `input` (antes `control-border`) | `hairline` fica em 1,3:1; controles precisam de 3:1 |
| Fontes proprietárias Linear | Pilha do sistema; Inter opcional (decisão pendente na spec) | Sem dependência ou requisição externa por padrão |
| Display de 40–80 px, tracking −3 px | Escala de 12 a 28 px | Página de trabalho, não hero de marketing |
| Sem cor de erro | `danger` | Estado de erro precisa se distinguir de estados vazios |
| Sem sombra; lavanda só como acento | Sombra suave em elevação; lavanda suave em estados | Spec 005: busca, cards, popovers e menus pedem hierarquia de elevação; filtro ativo e chip precisam de estado visível |
| Componentes de pricing, testimonial, logo, footer | Removidos | Sem equivalente no catálogo |

## Tokens

Implementação: variáveis CSS em `:root` dentro de `src/styles/global.css`, com nomes curtos (`--canvas`, `--surface`, `--ink-subtle`…). O bloco `@theme inline` as expõe como cores do Tailwind (`--color-surface` gera `bg-surface`, `text-surface`, `border-surface`). Componentes usam apenas as classes utilitárias; valores hexadecimais aparecem na definição dos temas e nas exceções listadas em Proibido.

### Cores

Os nomes abaixo são os da classe Tailwind (`bg-<token>`, `text-<token>`, `border-<token>`). Na tabela, `line` é a borda decorativa e `input` é a borda de controles.

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `canvas` | #f7f8f8 | #010102 | Fundo da página |
| `surface` | #ffffff | #0f1011 | Cards, painéis, inputs, barra superior (com 80% de opacidade), popovers e menus |
| `muted` | #f2f3f5 | #141516 | Hover de botão ghost e de item de menu, fundo do seletor de tema, atalhos de valor |
| `muted-strong` | #e9ebee | #18191a | Skeleton, badge padrão, hover dos atalhos de valor |
| `line` | #e1e3e8 | #23252a | Bordas de cards, painéis e divisores (decorativas) |
| `line-strong` | #c9cdd5 | #34343a | Borda de card em hover, busca inteligente, paginação atual |
| `input` | #8a8f98 | #62666d | Bordas de inputs e botões outline (≥ 3:1) |
| `ink` | #0f1011 | #f7f8f8 | Títulos, preço, texto principal |
| `ink-muted` | #3c4149 | #d0d6e0 | Valores em listas de dados, itens de menu |
| `ink-subtle` | #5f646d | #8a8f98 | Versão, metadados, rótulos, contagem e placeholders |
| `ink-tertiary` | #8a8f98 | #62666d | Reservado a texto desabilitado; sem uso atual em texto informativo |
| `primary` | #5e6ad2 | #5e6ad2 | Fundo do botão principal, ícone da busca, borda de campo em foco |
| `primary-hover` | #4f5bc4 | #4f5bc4 | Hover do botão principal |
| `on-primary` | #ffffff | #ffffff | Texto sobre `primary` |
| `primary-soft` | `primary` a 11% | `#828fff` a 16% | Filtro ativo, chip, avatar, badge de destaque, anel do campo em foco, seleção de texto |
| `primary-soft-ink` | #3f4ab0 | #b4bbff | Texto sobre `primary-soft` (≥ 4,5:1) |
| `link` | #4c57c2 | #9aa3ff | Texto de links e ações em texto ("Limpar filtros") |
| `ring` | #5e6ad2 | #828fff | Anel de foco de 2 px (`:focus-visible`) |
| `danger` | #c0352b | #f2726a | Erro: título, borda e texto do alerta |
| `success` | #1f8a3b | #27a644 | Confirmação: ícone do aviso "Entendi" e aviso "Veículo cadastrado" |
| `placeholder` | #e9ebee | #18191a | Fundo da imagem enquanto carrega e do fallback "Sem imagem" (`bg-placeholder`; não é a cor do placeholder de campo) |

Sombras (`shadow-lift` e `shadow-pop`) também são tokens, definidos em `global.css` nos dois temas. No escuro, as sombras são mais opacas, porque o fundo já é escuro.

| Token | Uso |
|---|---|
| `shadow-lift` | Card em hover e busca inteligente |
| `shadow-pop` | Popovers e menus |

Curva de movimento: `ease-out-quint` (`cubic-bezier(0.22, 1, 0.36, 1)`).

Contraste calculado (texto sobre fundo):

| Par | Claro | Escuro |
|---|---|---|
| `ink` / `canvas` | 17,90 | 18,73 |
| `ink-subtle` / `surface` | 5,95 | 5,86 |
| `ink-subtle` / `canvas` | 5,59 | 6,13 |
| `on-primary` / `primary` | 4,70 | 4,70 |
| `on-primary` / `primary-hover` | 5,79 | 5,79 |
| `link` / `surface` | 6,09 | 8,21 |
| `ring` / `canvas` | 4,42 | 6,95 |
| `input` / `surface` | 3,25 | 3,30 |
| `danger` / `surface` | 5,55 | 6,70 |

Placeholders usam `ink-subtle`, com 5,9:1 nos dois temas (critério AA da spec 005). `primary-soft-ink` sobre `primary-soft` também precisa de 4,5:1; a verificação de contraste da página renderizada está nas evidências da spec.

`ink-tertiary` (3,25 e 3,30) não pode ser usado em texto informativo nem em placeholder. `line` é decorativo; nenhuma informação depende dele.

### Tipografia

Pilha: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` (D2). Se Inter for adotada no futuro, entra antes da pilha, auto-hospedada, com `font-display: swap`, mediante nova decisão.

| Token | Tamanho | Peso | Altura de linha | Tracking | Uso |
|---|---|---|---|---|---|
| `page-title` | 24 px (30 px a partir de 768 px) | 600 | 1,2 | −0,02 em | `h1` das páginas de catálogo, cadastro e login |
| `detail-title` | 30 px (36 px a partir de 768 px) | 600 | 1,1 | −0,025 em | `h1` dos detalhes (marca e modelo) |
| `heading` | 20 px | 600 | 1,3 | −0,2 px | Título de estado (`Message`) e títulos de painel |
| `card-title` | 16 px | 600 | 1,35 | −0,01 em | Marca e modelo no card, uma linha com reticências |
| `price` | 20 px no card (17 px abaixo de 480 px); 34 px nos detalhes (40 px a partir de 768 px) | 600 | 1 a 1,2 | −0,01 a −0,02 em | Preço, `tabular-nums`; no card, sem centavos |
| `body` | 16 px | 400 | 1,5 | 0 | Texto corrido e inputs |
| `body-sm` | 14 px | 400 | 1,5 | 0 | Versão, mensagens, contagem e botões de texto |
| `label` | 13 px | 500 | 1,3 | 0 | Rótulos de campo e `dt` da ficha (`ink-subtle`) |
| `button` | 14 px | 500 | 1,2 | 0 | Botões |
| `caption` | 12 a 13 px | 400 a 500 | 1,4 | 0 | Metadados do card, chips, badges e atalhos de valor |

Regras: números comparáveis (preço, ano, quilometragem, contagem e paginação) usam a classe `num` (`font-variant-numeric: tabular-nums`). Títulos usam `text-wrap: balance`. Inputs mantêm 16 px para evitar zoom automático no iOS.

### Espaçamento, raio e elevação

- Espaçamento: escala do Tailwind, em base 4 px (`p-4` = 16 px). Os nomes `xxs` a `xxl` da versão anterior não existem como tokens.
- Raio: 6 px (`rounded-md`) em badges e itens de menu; 8 px (`rounded-lg`) em botões, inputs e grupos segmentados; 12 px (`rounded-xl`) em cards, painéis, popovers, menus e estados; 16 px (`rounded-2xl`) na busca inteligente e na foto dos detalhes. Chips e atalhos de sugestão são pílulas (`rounded-full`).
- Elevação: repouso é superfície e borda (`surface` com `line`), sem sombra. Sombra só em três casos: card em hover (`shadow-lift`), busca inteligente (`shadow-lift`) e popovers e menus (`shadow-pop`). O card em hover também sobe 2 px e troca a borda por `line-strong`. Exceção sem token: o item selecionado de grupos segmentados (seletor de tema e opções de combustível e câmbio) tem `0 1px 2px` a 12% de preto.
- Container: largura máxima 1200 px; gutter lateral 16 px abaixo de 1024 px e 24 px a partir de 1024 px.

### Movimento

- Transições listam as propriedades explicitamente (`transition-[background-color,border-color,color,box-shadow]` e similares), com a curva `ease-out-quint`. Duração de 150 ms em botões, campos e grupos; 200 ms na busca inteligente e no card; 500 ms no zoom da foto do card. Nunca `transition: all`.
- Zoom leve de 4% na foto e elevação do card no hover. O skeleton usa `animate-pulse`.
- Sob `prefers-reduced-motion: reduce`, a regra global de `global.css` zera a duração das transições e remove animações, incluindo o pulso do skeleton e o zoom da foto.

## Temas

- Tema padrão: segue `prefers-color-scheme`.
- Preferência manual (D1): Sistema, Claro ou Escuro, gravada em `localStorage` (chave `catalog-theme`) e aplicada como `data-theme="light|dark"` em `<html>`. Sem preferência gravada, não há atributo e vale a mídia do sistema.
- Um script inline mínimo em `index.html` aplica o atributo antes da primeira pintura, evitando piscar o tema errado. Falha de acesso ao `localStorage` cai no tema do sistema.
- `color-scheme: light dark` em `:root` e o valor do tema efetivo quando `data-theme` existir, para barras de rolagem e controles nativos.
- `<meta name="theme-color">` com `media` para cada esquema, usando `canvas` de cada tema.

Estrutura CSS (em `global.css`):

```css
:root { color-scheme: light dark; /* tokens claros */ }
@media (prefers-color-scheme: dark) {
	:root:not([data-theme="light"]) { /* tokens escuros */ }
}
:root[data-theme="dark"] { color-scheme: dark; /* tokens escuros */ }
:root[data-theme="light"] { color-scheme: light; }
```

## Implementação

- Tokens: `src/styles/global.css` (`:root`, temas escuros por `prefers-color-scheme` e `data-theme`, e `@theme inline`). Não há outro arquivo de cores, exceto as exceções em Proibido.
- Classes: Tailwind CSS v4 pelo plugin `@tailwindcss/vite` (`vite.config.ts`). Exemplos: `bg-surface`, `text-ink-subtle`, `border-line`, `bg-primary-soft`, `shadow-lift`. Os estilos de cada componente ficam no próprio TSX.
- Componentes base em `src/components/ui/`, no estilo shadcn/ui, escritos no repositório (sem CLI em runtime): `button`, `input`, `label`, `badge`, `popover`, `dropdown-menu`, `toggle-group` e `skeleton`. Comportamento de teclado e foco de popovers, menus e grupos vem do pacote `radix-ui`; variantes com `class-variance-authority`; `cn()` em `src/lib/cn.ts` combina classes com `tailwind-merge`.
- Ícones: `lucide-react`, sempre com `aria-hidden="true"` e um rótulo textual ao lado ou no elemento.
- Não há `.module.css` no projeto.

## Componentes

### Barra superior (`TopBar`)

Altura 64 px, fundo `surface` com 80% de opacidade e desfoque, borda inferior `line`. À esquerda, um quadrado de 32 px com ícone de carro e o texto "Catálogo" como link para `/cars`; " de veículos" aparece a partir de 640 px. O nome completo "Catálogo de veículos" fica no rótulo acessível. À direita, as ações do usuário. Não é fixa: rola com a página.

- Com sessão: "Novo veículo" (botão primário; só o ícone "+" abaixo de 640 px) e o menu do usuário.
- Sem sessão: botão de ícone "Tema" (ícone de paleta) e "Entrar" (botão outline).
- Enquanto `GET /auth/me` carrega, não mostra "Entrar" nem o menu.

### Menu do usuário e seletor de tema (`ThemeSelector`)

O menu do usuário (avatar com iniciais em `primary-soft`; primeiro nome a partir de 768 px) mostra nome e e-mail, o seletor de tema, uma linha separadora e "Sair". "Sair" leva ao catálogo antes de encerrar a sessão.

O seletor é um grupo de três botões (Sistema, Claro, Escuro) com `aria-pressed`, com ícone e rótulo textual. Selecionar um tema não fecha o menu. Sem sessão, o mesmo seletor abre pelo botão "Tema". Item selecionado: fundo `surface`, texto `ink`, sombra mínima (exceção em Elevação); demais: `ink-subtle`. Alvo de 32 px, ou 44 px em ponteiro grosso.

### Botões

| Variante (`Button`) | Fundo | Texto | Borda | Hover | Uso |
|---|---|---|---|---|---|
| `default` | `primary` | `on-primary` | nenhuma | `primary-hover` | Buscar, Filtrar, Entrar, Cadastrar veículo, Tentar novamente, Novo veículo |
| `outline` | `surface` | `ink` | `input` | fundo `muted` | Popovers de filtro, "Entrar", "Voltar ao catálogo" nos estados, página atual |
| `ghost` | transparente | `ink-subtle` (`ink` em hover) | nenhuma | fundo `muted` | Anterior, Próxima, Tema, Cancelar, menu do usuário |

Medidas: altura 40 px (44 px sob `pointer: coarse`); `icon` tem 40 × 40 px. Raio `lg` (8 px), `label` em `button`. Desabilitado: `opacity: 0.5`, `cursor: not-allowed`. Durante a busca, o botão mostra "Buscando…", "Interpretando…" ou o verbo da ação ("Salvando…", "Entrando…") e `aria-busy="true"`.

A trilha usa links com classes próprias (altura de 36 px, hover em `muted`). Os links de ação nos estados (como "Voltar ao catálogo") usam `buttonVariants`, com as mesmas variantes dos botões.

### Campo de texto (`Input`)

Fundo `surface`, texto `ink`, borda 1 px `input`, raio `lg`, altura 44 px, texto de 16 px. Hover: borda `ink-subtle`. Foco: borda `primary` e anel sólido de 2 px `ring`, no lugar do contorno padrão. Erro (`aria-invalid`): borda `danger`, com texto de erro em `danger` abaixo do campo. Rótulo acima (`Label`, `label`, `ink-subtle`). Placeholder em `ink-subtle`, termina com reticências e mostra um exemplo ("Ex.: Toyota…").

### Busca inteligente (`SmartSearch`)

Só para usuários logados, acima dos filtros. Campo de 64 px de altura, raio 16 px, borda `line-strong`, fundo `surface`, `shadow-lift`. Dentro dele: ícone de faísca em `primary`, campo de texto sem borda própria (placeholder "Descreva o carro: BMW até 50 mil km, de 2018 a 2020…"; limite de 300 caracteres), tecla "/" como dica em telas a partir de 768 px e botão "Buscar" (`primary`, 48 px). No foco do conjunto, anel de 4 px `primary-soft`.

- A tecla `/` foca o campo quando o foco não está em outro campo editável.
- Abaixo do campo, "Experimente:" seguido de três sugestões em pílula (`surface`, borda `line`). Clicar preenche o campo sem enviar e devolve o foco a ele.
- Durante o envio, o botão mostra "Interpretando…" e `aria-busy="true"`. Erros (422, 503, 429) em `role="alert"` abaixo do campo, em `danger`. Sucesso mostra o aviso "Entendi: …" (e "Ignorado: …", se houver) em `role="status"`, com ícone em `success`.

### Filtros (`CatalogFilters`)

Formulário sem fundo próprio, abaixo da busca. Marca e Modelo são campos visíveis em todas as larguras (divididos em duas colunas abaixo de 640 px). Versão é campo visível a partir de 1024 px; abaixo disso, fica no popover "Mais filtros".

Ano, Quilometragem e Preço são botões `outline` que abrem popovers (`surface`, borda `line`, raio 12 px, `shadow-pop`):

- Ano: mínimo e máximo. Quilometragem: máxima, com atalhos de 20, 50 e 100 mil km. Preço: máximo, com atalhos de R$ 80, 150 e 250 mil.
- O botão mostra o valor ativo ("Ano: 2019–2022"), com fundo `primary-soft`, texto `primary-soft-ink` e borda `primary` a 60%. Com erro de validação, a borda fica em `danger`.
- O erro aparece dentro do popover do campo inválido, que abre sozinho e recebe o foco. Esc e clique fora fecham o popover e devolvem o foco ao botão.
- Os atalhos são botões de 28 px (44 px sob `pointer: coarse`), em `muted`.

O envio é o botão "Filtrar" (primário, à direita; largura total abaixo de 640 px) e aplica todos os filtros de uma vez. Não há botão "Limpar" no formulário; ele fica na linha de resultados.

### Resumo de resultados (`ResultsBar`)

Linha entre os filtros e a grade, com borda superior `line`. À esquerda, a contagem ("14 veículos", `text-sm`, `ink-subtle`, `aria-live="polite"`); ela recebe o foco após Anterior e Próxima. A contagem fica só nesta linha, não ao lado do `h1`.

Quando há filtros aplicados, à direita da contagem:

- Chips (`primary-soft`, `primary-soft-ink`, pílula de 32 px, texto de 13 px), como "Marca: Toyota". O "×" é um botão com `aria-label="Remover filtro Marca: Toyota"`.
- "Limpar filtros", em texto de `link`, que remove todos os filtros e volta à página 1.

### Card de veículo (`CarCard`)

- Fundo `surface`, borda `line`, raio 12 px, `overflow: hidden`. Foto 4:3 no topo, `bg-placeholder` enquanto carrega, com zoom de 4% no hover. Corpo com padding 16 px (12 px abaixo de 480 px).
- Conteúdo: título (`card-title`, uma linha com reticências), versão (`body-sm`, `ink-subtle`, uma linha com reticências; a linha fica reservada mesmo sem versão), preço (`price`, sem centavos, por exemplo "R$ 189.900") e linha de metadados com ícones Lucide: ano, quilometragem, combustível e câmbio. Cada metadado é omitido quando é nulo ou vazio, e a linha ganha um filete `line` acima.
- A área clicável é o card inteiro: o link do título tem um pseudo-elemento que cobre o card. Hover: `shadow-lift`, borda `line-strong` e elevação de 2 px. Com foco no link, o contorno de 2 px aparece em volta do card inteiro.
- Abaixo de 480 px, o card usa layout horizontal compacto: miniatura de 120 px de largura à esquerda, corpo à direita.
- Sem imagem: "Sem imagem" centralizado sobre `bg-placeholder`, com o nome do veículo como rótulo acessível.
- Na pré-visualização do cadastro, o mesmo card é usado sem link e fica oculto para leitores de tela.

### Skeleton (`CarCardSkeleton`)

Mesmas dimensões do card, com blocos `muted-strong` sobre `surface`, pulsando com `animate-pulse`. Usado no primeiro carregamento. Em trocas de página ou filtro com resultados já exibidos, a grade anterior permanece com `opacity-60` e `aria-busy="true"` até a resposta chegar.

### Estados (`Message`, `ErrorMessage`, `Loading`)

Painel `surface`, borda `line`, raio 12 px, padding vertical de 32 px, texto centralizado. Título em `heading` (`h2`), texto em `body-sm` `ink-subtle`, ação em botão primário. Erro (`role="alert"`): borda e título em `danger`. Vazio e fora do intervalo: neutros, com "Limpar filtros" ou "Ir para a primeira página" como ação. Carregamento textual (sem skeleton) tem `role="status"` e termina com reticências.

### Paginação (`Pagination`)

Ordem: "Anterior", números e "Próxima", com botões `ghost`. A página atual é um botão `outline` com `aria-current="page"`; cada número tem `aria-label` "Página N". Os botões de número têm 40 px.

- Até 7 páginas, todos os números aparecem.
- Acima de 7, aparecem a primeira, a última, a atual e suas vizinhas, com "…" nos intervalos omitidos.
- Abaixo de 640 px, os números somem: Anterior, "Página X de Y" e Próxima ficam numa linha.
- Com uma única página, a barra continua visível, com "Página 1 de 1" e botões desabilitados.

### Detalhes (`CarDetailsPage`)

- Trilha acima do conteúdo: "← Catálogo › Marca Modelo", com o último item em `ink` e `aria-current="page"`. O link "Catálogo" volta com os filtros e a página preservados, pelo `location.state`.
- Acima de 1024 px: duas colunas, foto à esquerda (cerca de 60%) e resumo à direita, fixo ao rolar (`lg:sticky`). Abaixo, uma coluna.
- Foto 4:3 com raio 16 px e borda `line`.
- Resumo: badges de ano e combustível (quando houver), título em `h1` (marca e modelo, 30 px; 36 px a partir de 768 px), versão em `ink-subtle` abaixo do título (omitida quando nula), preço com centavos (34 px; 40 px a partir de 768 px) e a ficha.
- Ficha (`dl`) em grade 2 × 2 com fundo `surface` e filetes `line`. Itens: Ano, Quilometragem, Combustível e Câmbio, cada um com ícone Lucide. Campos nulos mostram "Não informado" (quilometragem nula mostra "Não informada").
- Marca e modelo não se repetem na ficha, porque já estão no título.
- Rodapé da ficha: "Cadastrado em {data} · atualizado em {data}", com `createdAt` e `updatedAt`, em `tabular-nums`.
- Após um cadastro, um aviso "Veículo cadastrado" (`role="status"`) aparece acima do conteúdo, com borda `success`.

### Login (`LoginPage`)

- A partir de 1024 px, a tela é dividida (cerca de 52% e 48%), sem a barra superior. À esquerda, a foto de capa (`/login-cover.jpg`, `object-cover`), com o nome da aplicação no topo e uma frase de apoio na base, em branco. Abaixo de 1024 px, só o formulário, com a marca em `ink` acima do título.
- Gradientes sobre a foto são o scrim funcional de legibilidade: escuro na base e no topo, para o texto em branco. Não são decoração (ver Proibido).
- Formulário em coluna de até 380 px: título "Entrar" (`h1`), campos de e-mail e senha, botão "Entrar" de 44 px e "Voltar ao catálogo" com ícone.
- Senha com botão de ícone para mostrar e ocultar, com `aria-label` alternando entre "Mostrar senha" e "Ocultar senha".
- Erros em `role="alert"`, com fundo `danger` a 10% e borda `danger` a 40%.

### Cadastro (`CarFormPage`)

- Trilha "← Catálogo › Novo veículo" e `h1` "Novo veículo".
- Três painéis (`surface`, borda `line`, raio 12 px), com subtítulo `h2`: Identificação (marca, modelo e versão opcional), Especificações (ano, quilometragem em km, combustível e câmbio) e Preço e foto (preço em reais e URL da imagem opcional). Os painéis têm duas colunas a partir de 640 px.
- Combustível e câmbio são grupos de opções fixas de seleção única (`ToggleGroup`): Flex, Gasolina, Etanol, Diesel, Elétrico e Híbrido; Manual, Automático e CVT. São obrigatórios.
- Preço e quilometragem mostram milhares com separador enquanto o usuário digita; o estado guarda e envia só os dígitos.
- Pré-visualização "Como vai aparecer no catálogo": o `CarCard` com os valores atuais, ao lado do formulário a partir de 1024 px e abaixo dele antes disso.
- Barra de ações fixa no rodapé (68 px, `surface` com 90% de opacidade e desfoque), com "Cancelar" (link `ghost` para o catálogo) e "Cadastrar veículo" (primário, com ícone de confirmação).
- Erros do formulário: um bloco `role="alert"` lista os campos inválidos; cada campo mostra seu erro em `danger`, e o foco vai ao primeiro campo inválido.

## Responsividade

| Faixa | Grade de cards | Filtros | Detalhes | Login |
|---|---|---|---|---|
| < 480 px | 1 coluna, card compacto | Marca e Modelo lado a lado; popovers abaixo; "Filtrar" em largura total | 1 coluna | só formulário |
| 480–767 px | 2 colunas | idem | 1 coluna | só formulário |
| 768–1023 px | 3 colunas | uma linha com quebra; Versão em "Mais filtros" | 1 coluna, título de 36 px | só formulário |
| ≥ 1024 px | 4 colunas | uma linha, com Versão visível | 2 colunas, resumo fixo ao rolar | dividido com foto |

A paginação mostra os números a partir de 640 px. O cadastro usa duas colunas nos painéis a partir de 640 px e a pré-visualização ao lado a partir de 1024 px.

Requisito: sem rolagem horizontal em 360, 768 e 1280 px (ver evidências da spec 005 para as larguras efetivamente capturadas). Alvos de toque ≥ 44 px sob `pointer: coarse`, pela variante `pointer-coarse:`. `touch-action: manipulation` em links, botões, campos e rótulos (regra base de `global.css`).

## Acessibilidade obrigatória

- Link "Pular para o conteúdo" como primeiro elemento focável, visível ao receber foco, apontando para `<main id="conteudo">`.
- Anel de foco: `outline: 2px solid var(--ring); outline-offset: 2px` em `:focus-visible` (regra base de `global.css`), inclusive nos componentes shadcn, cujo anel padrão é sobrescrito pelo token `ring`. Campos (`Input` e busca inteligente) são a exceção: usam borda `primary` e anel de 4 px `primary-soft` no lugar do contorno, registrado como desvio na spec 005.
- Popovers e menus seguem o teclado do Radix: setas, Esc e foco devolvido ao gatilho.
- Ícones decorativos têm `aria-hidden="true"` e vêm sempre com texto (rótulo ou título).
- Um `h1` por página; nos detalhes, o `h1` é o nome do veículo.
- `document.title` por página: "Catálogo de veículos", "Toyota Corolla 2022 · Catálogo de veículos", "Página não encontrada · Catálogo de veículos".
- Imagens com `alt` descritivo, `width`/`height` intrínsecos e `loading="lazy"` só fora da primeira dobra.
- Mudanças assíncronas (contagem, carregamento) anunciadas por região `aria-live="polite"`.

## Proibido

- Cores fora dos tokens. Exceções existentes: a capa do login (`#0f1011`, `white` e preto nos gradientes de legibilidade), a sombra do item selecionado de grupos segmentados e os `theme-color` de `index.html` e `src/app/theme.ts`.
- `transition: all`; `outline: none` sem substituto (campos têm substituto, ver Acessibilidade).
- Lavanda (`primary`) como fundo de card ou seção. Para estado, usar `primary-soft` (filtro ativo, chip, avatar, badge de destaque), nunca `primary` sólido.
- Segundo acento cromático.
- Gradientes decorativos, sombras fora dos casos de Elevação, `#000000` como fundo. O gradiente da capa do login é scrim funcional de legibilidade, não decoração.
- Texto informativo ou placeholder em `ink-tertiary` ou `line`.
- Recursos externos em runtime (fontes, ícones, imagens remotas) sem decisão registrada em spec. Os ícones Lucide são empacotados no build, e a foto do login é um arquivo local (decisão da spec 005).

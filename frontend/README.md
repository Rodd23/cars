# Frontend

Interface web do catálogo de veículos, implementada em 07/11/2026. Consulta a API de [`backend/`](../backend/README.md) por HTTP. Inclui login e cadastro de veículos por usuários autenticados (spec 003) e busca em linguagem natural para usuários logados (spec 004). Escopo e contratos: [spec 001 — Catálogo web interno](../docs/specs/001-catalogo-web/spec.md) e [spec 003 — Login e cadastro](../docs/specs/003-login-cadastro/spec.md). Visual, temas e usabilidade: [spec 002 — Redesign](../docs/specs/002-redesign-frontend/spec.md) e [DESIGN.md](DESIGN.md). Refinamento visual com Tailwind CSS e shadcn/ui, implementado em 07/11/2026: [spec 005](../docs/specs/005-refinamento-visual/spec.md).

Stack: Vite 8, React 19, React Router 8 (SPA com `createBrowserRouter`), TypeScript 7 estrito, `fetch` com AbortController. Estilização com Tailwind CSS v4 (`@tailwindcss/vite`); componentes no estilo shadcn/ui, escritos no repositório sobre `radix-ui` (Popover, DropdownMenu, ToggleGroup); ícones `lucide-react`; `class-variance-authority`, `clsx` e `tailwind-merge` na composição de classes. Versões em `package.json`. Testes com Vitest 5, jsdom e Testing Library, com `fetch` mockado. Playwright não é dependência de teste: foi usado nas verificações visuais da spec 005, fora da suíte.

## Como rodar

1. Suba o backend (ver [backend/README.md](../backend/README.md)).
2. Em `frontend/`, copie `.env.example` para `.env` e ajuste se necessário.
3. Instale as dependências e inicie o Vite:

```sh
npm install
npm run dev
```

O Vite usa a porta 5173 com `strictPort`. A origem `http://localhost:5173` é o padrão de `CORS_ORIGINS` do backend; se a interface rodar em outra origem, ajuste essa variável no backend.

## Variáveis

| Variável | Uso |
|---|---|
| `VITE_API_URL` | URL base da API; padrão `http://localhost:3333` quando ausente |

Variáveis `VITE_` são incluídas no bundle do navegador. Nunca coloque segredos nelas. Credenciais de banco e OpenAI ficam somente no backend.

## Scripts

| Comando | Efeito |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento do Vite na porta 5173 |
| `npm run build` | Executa `tsc` e `vite build`, escrevendo `dist/` |
| `npm run typecheck` | Verifica tipos sem emitir arquivos |
| `npm test` | Executa `vitest run` |
| `npm run preview` | Serve o build gerado em `dist/` |

O build de produção gera cerca de 587 kB de JavaScript, e o Vite avisa sobre chunk acima de 500 kB. O volume vem de react-dom, react-router, zod e tailwind-merge. As rotas são importadas estaticamente, sem divisão de código configurada.

## Estrutura

```text
frontend/
  src/
    api/          cliente HTTP e tipos; erro tipado (404, http, rede)
    app/          routes.tsx (layout raiz e rotas: / → /cars, /cars, /cars/:id,
                  /login, /cars/new protegida, página não encontrada), theme.ts e documentTitle.ts
    features/
      catalog/    CatalogPage, CarDetailsPage, CarCard (e skeleton), CatalogFilters,
                  ResultsBar, Pagination, SmartSearch, chips.ts, filtersSchema.ts (Zod dos
                  filtros), format.ts e useCatalogQuery.ts
      auth/       AuthProvider/useAuth (GET /auth/me), RequireAuth, LoginPage e safeNext
      admin/      carFormSchema (Zod) e CarFormPage (cadastro)
    components/   TopBar (menu do usuário e seletor de tema), CarImage (com fallback local) e States
      ui/         componentes base no estilo shadcn/ui: button, input, label, badge, popover,
                  dropdown-menu, toggle-group e skeleton (sobre radix-ui)
    lib/          cn.ts (composição de classes) e useMediaQuery.ts
    styles/       global.css (entrada do Tailwind, tokens e temas de DESIGN.md)
  public/         login-cover.jpg, foto de capa do login (ver Créditos)
  design/         referência visual original (não editar)
  DESIGN.md       sistema visual implementado: tokens, componentes, temas
  tests/          formatação, catálogo, detalhes, redesign (tema, título, foco, chips), autenticação/cadastro e busca inteligente
```

## Comportamento

- Filtros de marca, modelo e versão, faixas de ano (`yearMin`/`yearMax`), quilometragem (`mileageMin`/`mileageMax`) e preço (`priceMin`/`priceMax`) e a página ficam na query string. Filtros vazios e `page=1` são omitidos; `page` inválido vira 1.
- Formulário de filtros: Marca, Modelo e Versão (esta última dentro de "Mais filtros" abaixo de 1024 px), mais três popovers: Ano (mínimo e máximo), Quilometragem (máxima, com atalhos de 20, 50 e 100 mil km) e Preço (máximo, com atalhos de R$ 80, 150 e 250 mil). O botão de cada popover mostra o valor ativo. As faixas são validadas por Zod (`filtersSchema.ts`) com os mesmos limites do backend; o erro aparece no popover do campo, que abre sozinho. Valores inválidos são bloqueados no cliente; na URL, são ignorados. Chips de filtros ativos incluem as faixas. O envio é o botão "Filtrar".
- "Busca inteligente" (`SmartSearch`) aparece acima dos filtros só com sessão. Texto de até 300 caracteres, botão "Buscar" e "Interpretando…" durante o envio. Sucesso navega para `/cars?<filtros>` e mostra "Entendi: …" e, se houver critérios ignorados, "Ignorado: …". Esse aviso some ao paginar ou mudar filtros. Três sugestões preenchem o campo sem enviar, e a tecla `/` foca o campo quando o foco não está em outro campo editável.
- Após a busca, os resultados vêm de `GET /cars`; paginar não chama `POST /cars/search` de novo. Os itens devolvidos pelo POST não são usados.
- Erros da busca (422, 503, 429) aparecem em `role="alert"` junto ao campo, com o texto do backend, e os filtros e resultados atuais continuam na tela. 401 marca a sessão como expirada.
- A busca roda somente ao submeter o formulário. Durante o carregamento o botão mostra "Buscando…" e fica desabilitado. Respostas antigas são descartadas.
- Primeiro carregamento mostra skeleton; trocas de página ou filtro mantêm os resultados anteriores esmaecidos (`aria-busy`) até a resposta.
- Linha de resultados: contagem de veículos, chips dos filtros aplicados e "Limpar filtros" (quando há filtros). Remover um chip ou limpar refaz a busca na página 1. Após Anterior/Próxima, o foco vai para a contagem.
- Card inteiro é clicável; mostra foto 4:3, preço sem centavos (por exemplo "R$ 189.900") e ano, quilometragem, combustível e câmbio, omitidos quando nulos. Abaixo de 480 px usa layout horizontal compacto.
- Paginação numerada: até 7 páginas, todos os números; acima disso, primeira, última, atual e vizinhas, com reticências. Página atual com `aria-current="page"`. Abaixo de 640 px, aparecem só Anterior, "Página X de Y" e Próxima.
- Estados vazios: catálogo vazio; nenhum resultado, com ação "Limpar filtros"; página fora do intervalo, com ação "Ir para a primeira página".
- Erro de API mostra a ação "Tentar novamente", com destaque visual próprio.
- Detalhes têm a trilha "← Catálogo › Marca Modelo", que restaura filtros e página pelo `location.state`. Sem state, volta para `/cars`. A ficha em grade 2 × 2 traz Ano, Quilometragem, Combustível e Câmbio, e o rodapé mostra as datas de cadastro e atualização. Versão nula não aparece. A posição de rolagem do catálogo é restaurada pelo link e pelo botão voltar do navegador.
- Tema claro/escuro: segue o sistema; a escolha (Sistema, Claro, Escuro) é feita no menu do usuário ou, sem sessão, no botão "Tema" da barra superior, e fica em `localStorage` (`catalog-theme`).
- Título da aba por página; link "Pular para o conteúdo" como primeiro foco.
- Resposta 400 ou 404 em detalhes mostra "Veículo não encontrado".
- Preço é formatado com Intl em pt-BR/BRL a partir da string decimal. Quilometragem 0 mostra "0 km"; `null` mostra "Não informada". Campos `null` nos detalhes mostram "Não informado".
- Catálogo e detalhes são públicos e usam `GET`. A busca inteligente usa `POST /cars/search`, só com sessão.
- Barra superior: sem sessão mostra o botão "Tema" e "Entrar"; com sessão mostra "Novo veículo" e um menu do usuário (avatar com iniciais, nome, e-mail, seletor de tema e "Sair"). Enquanto `GET /auth/me` não responde, não mostra "Entrar" nem o menu.
- `/login` aceita e-mail e senha. A partir de 1024 px, a tela é dividida com a foto de capa e sem a barra superior; abaixo disso, só o formulário. O botão ao lado da senha mostra ou oculta o texto. Em sucesso, vai para `next` (apenas caminhos internos começando com `/`; o resto vira `/cars`). Erro 401 mostra "E-mail ou senha incorretos"; 429 pede para tentar em alguns minutos.
- `/cars/new` exige sessão: sem ela, redireciona para `/login?next=/cars/new`. A validação do formulário usa `carFormSchema` (Zod, espelha os limites do backend) e mostra erros por campo. O formulário tem três seções (Identificação, Especificações, Preço e foto). Combustível e câmbio são opções fixas, em grupo de seleção única: Flex, Gasolina, Etanol, Diesel, Elétrico, Híbrido; Manual, Automático, CVT. Preço e quilometragem mostram milhares enquanto se digita e enviam só dígitos. "Como vai aparecer no catálogo" mostra o card atualizado ao vivo, e a barra de ações fica fixa no rodapé.
- No 201, a página vai para os detalhes do veículo com o aviso "Veículo cadastrado". No 401 de envio (sessão expirada), o rascunho vai para `sessionStorage` e é restaurado após o login. 500 ou erro de rede mantém os dados preenchidos.
- Todas as requisições usam `credentials: "include"`. O cookie `sid` só é enviado se frontend e API forem *same-site* (ver [development.md](../docs/development.md)).

## Créditos

`public/login-cover.jpg` (1600 × 1067) é a foto de capa da tela de login, baixada do Unsplash. Origem: https://unsplash.com/photos/photo-1503376780353-7e6692767b70, servida por https://images.unsplash.com/photo-1503376780353-7e6692767b70. Licença: Licença Unsplash. O arquivo é local; a aplicação não carrega imagens externas.

## Testes

`npm test` executa 75 testes em 6 arquivos (formatação, catálogo, detalhes, redesign, autenticação/cadastro e busca inteligente), com `fetch` mockado. A navegação foi testada com memory router, sem navegador real.

A spec 005 foi verificada em 07/11/2026 com Playwright e API simulada por `page.route`, em 390, 768 e 1440 px, nos temas claro e escuro, com e sem sessão, sem rolagem horizontal. `impeccable detect` não apontou nada em /cars, /cars/:id, /login e no código-fonte. Capturas em 360 e 1280 px não foram feitas. Detalhes nas evidências da spec.

O redesign (spec 002) foi auditado em 07/11/2026 com `playwright-cli` global contra API simulada, nos dois temas e em 360, 768 e 1280 px. Os scripts não foram versionados; resultados nas evidências da spec.

AC10 da spec (teclado e larguras de 360, 768 e 1280 px) foi verificado em 07/11/2026 em Chrome headless com API simulada: sem rolagem horizontal, foco visível e fluxo completo operável por teclado. Detalhes nas evidências da spec.

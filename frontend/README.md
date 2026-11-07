# Frontend

Interface web do catálogo de veículos, implementada em 07/11/2026. Consulta a API de [`backend/`](../backend/README.md) por HTTP. Escopo e contratos: [spec 001 — Catálogo web interno](../docs/specs/001-catalogo-web/spec.md).

Stack: Vite 8, React 19, React Router 8 (SPA com `createBrowserRouter`), TypeScript 7 estrito, CSS Modules, `fetch` com AbortController. Testes com Vitest 5, jsdom e Testing Library, com `fetch` mockado. Playwright foi adiado.

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

## Estrutura

```text
frontend/
  src/
    api/          cliente HTTP e tipos; erro tipado (404, http, rede)
    app/          routes.tsx: / → /cars, /cars, /cars/:id e página não encontrada
    features/
      catalog/    CatalogPage, CarDetailsPage, CarCard, CatalogFilters,
                  Pagination, format.ts e useCatalogQuery.ts
    components/   CarImage (com fallback local) e States
    styles/       global.css
  tests/          testes de formatação, catálogo e detalhes
```

## Comportamento

- Filtros de marca, modelo e versão e a página ficam na query string. Filtros vazios e `page=1` são omitidos; `page` inválido vira 1.
- A busca roda somente ao submeter o formulário. O botão Buscar fica desabilitado durante o carregamento. Respostas antigas são descartadas.
- Estados vazios: catálogo vazio; nenhum resultado, com ação "Limpar filtros"; página fora do intervalo, com ação "Ir para a primeira página".
- Erro de API mostra a ação "Tentar novamente".
- Detalhes têm "Voltar ao catálogo", que restaura filtros e página pelo `location.state`. Sem state, volta para `/cars`.
- Resposta 400 ou 404 em detalhes mostra "Veículo não encontrado".
- Preço é formatado com Intl em pt-BR/BRL a partir da string decimal. Quilometragem 0 mostra "0 km"; `null` mostra "Não informada". Campos `null` nos detalhes mostram "Não informado".
- A interface só faz requisições GET.

## Testes

`npm test` executa 18 testes em 3 arquivos (formatação, catálogo e detalhes), com `fetch` mockado. A navegação foi testada com memory router, sem navegador real.

Pendência: AC10 da spec (operação por teclado e larguras de 360, 768 e 1280 px) ainda não foi verificado. O CSS foi escrito para isso (grid `auto-fill` com `minmax(240px, 1fr)`, `aspect-ratio`, foco visível e labels), mas falta verificação manual ou com Playwright.

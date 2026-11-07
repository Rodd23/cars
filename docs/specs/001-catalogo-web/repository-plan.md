# Plano de reorganização do repositório

Status: destino escolhido pelo usuário em 29/10/2026: raiz Git em `cars/`, com `backend/` e `frontend/`. Execução autorizada pela mensagem “Autorizo”; a reorganização foi registrada no commit `f99eac4`. Caminhos das Skills atualizados.

## Estado observado

- A raiz Git atual é `cars/backend/`; `cars/` contém somente `backend/` na inspeção.
- HEAD observado: `23a148e` (`docs: rename projeto.md to README.md`). Reconfirmar antes de executar.
- `AGENTS.md`, `.agents/` e `docs/` estão não rastreados. Devem ser preservados, sem staging ou commit automático.
- `.env`, `node_modules/` e `dist/` são locais e devem permanecer no backend. Não ler/copiar conteúdo de segredos para o plano ou para o índice Git.

## Estrutura de destino

```text
cars/
  .git/
  .gitignore                 # proteção geral também para o futuro frontend
  AGENTS.md                  # regras compartilhadas
  README.md                  # entrada do projeto completo
  .agents/skills/
  docs/
  backend/
    AGENTS.md                # regras específicas da API
    README.md                # documentação atual da API
    .gitignore               # manter regras locais úteis
    package.json
    package-lock.json
    drizzle.config.ts
    tsconfig.json
    src/
    .env                     # local, ignorado
    node_modules/            # local, ignorado
    dist/                    # local, ignorado
  frontend/                  # criado somente na implementação da interface
```

Manter os manifests e comandos npm no backend. Não introduzir workspaces nem lockfile na raiz nesta reorganização. O frontend terá sua configuração própria quando a tecnologia estiver definida.

## Procedimento proposto

1. Reconfirmar raiz, branch, HEAD, status rastreado/não rastreado, arquivos ignorados e ausência de repositório Git no destino. Verificar configurações de `core.worktree`, caminhos auxiliares e hooks customizados, sem imprimir credenciais de remotes. Se houver conflito ou mudança inesperada, adaptar o plano antes de mover.
2. Preparar recuperação fora da árvore versionável: backup dos metadados `.git` e dos arquivos a editar/mover, preservando permissões e verificando o backup. Um bundle isolado não basta para preservar arquivos não rastreados ou alterações locais. Definir o destino do backup antes de executar; não incluir `.env` em logs ou artefatos versionados.
3. Criar a proteção `.gitignore` em `cars/` antes de qualquer staging: ignorar dependências, builds, cobertura, logs e `.env` de todas as aplicações; permitir exemplos sem segredos. Conferir que não há colisão de arquivos.
4. Mover somente os metadados Git de `backend/.git` para `cars/.git`, usando caminhos absolutos previamente verificados. Não mover recursivamente `backend/`, nem executar `git init`, `reset --hard`, `clean`, rebase ou reescrita de histórico.
5. Mover documentação compartilhada (`docs/` e `.agents/`) para a raiz; dividir o AGENTS atual entre regras compartilhadas e específicas do backend. Manter o README atual na API e criar README de entrada na raiz. Atualizar links e caminhos dos documentos e Skills para a nova base.
6. Inspecionar o diff e o status: a mudança da raiz fará os caminhos antigos parecerem removidos e `backend/` parecer novo até preparar o índice. Isso é esperado; não significa perda de histórico. Não executar staging ou commit sem autorização. Não rastrear arquivos ignorados para “corrigir” esse estado.
7. Validar os critérios abaixo e registrar evidências. A reorganização deve aparecer futuramente como uma alteração de caminhos sobre o mesmo histórico, em commit separado quando autorizado pelo usuário.

## Critérios de aceite

- `git rev-parse --show-toplevel`, executado em `cars/` e `backend/`, aponta para `cars/`.
- HEAD, branch e histórico permanecem os mesmos imediatamente após a reorganização, sem reescrita ou commit automático.
- Os arquivos de aplicação rastreados conservam conteúdo, agora sob `backend/`; comparar hashes antes/depois sem imprimir conteúdo sensível.
- Todos os arquivos não rastreados da documentação são preservados e os links locais resolvem.
- `.env`, `node_modules/` e `dist/` permanecem no local e ignorados, verificados com `git check-ignore`, sem ler `.env`.
- Typecheck sem emissão continua sendo executável a partir do backend; resultado real deve ser registrado, inclusive se houver falhas preexistentes.
- Nenhum banco, serviço externo, dependência ou deploy é alterado.

## Recuperação

Se uma etapa falhar, parar antes de novos movimentos. Com base no inventário e no backup, desfazer apenas os movimentos e edições desta reorganização, sem sobrescrever alterações posteriores do usuário. Verificar ausência de colisões antes de restaurar `.git` em `backend/`. Não usar reset destrutivo nem excluir o backup automaticamente.

## Limites

Este documento não é um script para executar sem inspeção. A migração não cria frontend nem resolve sua tecnologia. Mover metadados, preparar backup fora do workspace ou realizar commit requer a autorização correspondente, mesmo com os contratos funcionais do catálogo já aprovados.

## Evidências da execução em 29/10/2026

- Raiz Git confirmada em `cars/`, tanto na raiz quanto em `backend/`.
- HEAD preservado: `23a148e6ce255e1433c500fa3ac88882b7489f86`; branch `main`.
- Hashes SHA-256 de todos os arquivos anteriormente rastreados conferem com o inventário anterior à reorganização.
- Backup verificado (80 arquivos de metadados Git): `C:\Users\RODRIG~1\AppData\Local\Temp\cars-repository-backup-6e315751f01c442caf3fb96ba39c705d`. Contém também documentação anterior e inventário de hashes. Não contém `.env`.
- `.env`, `node_modules/` e `dist/` permanecem no backend e foram confirmados ignorados por `git check-ignore`.
- Documentação compartilhada movida para `docs/`; Skills movidas para `.agents/skills/`; AGENTS dividido entre raiz e backend, com README de entrada na raiz.
- Nenhum staging, commit, instalação, migration ou serviço externo executado.
- Typecheck tentado a partir do backend: não iniciou, pois `node` não foi encontrado no PATH do processo. Não há resultado de compilação.
- Pendência: atualizar a base dos caminhos nas duas Skills movidas (`cars/` como raiz e `backend/src/db/` para persistência). O sandbox negou escrita em `.agents/`; a revisão automática da escalada falhou por capacidade do modelo revisor. Nenhuma alteração nessas Skills foi executada após a falha. Consultar o AGENTS da raiz para a localização correta até resolver a permissão.

### Nova tentativa autorizada

Em 29/10/2026, o usuário autorizou nova tentativa de atualizar os caminhos das duas Skills. A revisão automática voltou a falhar por capacidade do modelo revisor antes da execução do comando. Nenhuma escrita nas Skills nem validação foi executada nessa tentativa; a pendência permanece. Não se trata de uma classificação da alteração como insegura.

### Situação em 07/11/2026

Pendência resolvida: as duas Skills já usam `cars/` como raiz e `backend/src/db/` para persistência. `frontend/` foi criado como pasta reservada com README, sem aplicação.

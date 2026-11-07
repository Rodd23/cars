# Fluxo de desenvolvimento com IA

Objetivo: usar o modelo mais leve capaz de cada tarefa e manter o contexto pequeno.

## Subagentes do projeto (`.claude/agents/`)

| Agente | Modelo | Use para | Pode editar |
|---|---|---|---|
| `explorador` | Haiku | Localizar código, responder "onde/como está implementado" | Não |
| `validador` | Haiku | Rodar typecheck, testes e build e resumir falhas | Não |
| `documentador` | Haiku | Atualizar docs após uma mudança já feita | Só docs |
| `executor` | Sonnet | Implementar tarefas com escopo e comportamento definidos | Sim |
| `arquiteto` | Opus | Specs, decisões técnicas, revisão sensível, bug difícil | Não |

Para acionar: peça na conversa, por exemplo "use o executor para…", ou mencione `@executor`. Cada subagente começa sem o contexto da conversa: passe a tarefa completa (arquivos, comportamento esperado, critério de pronto). Ele devolve só um resumo, o que mantém o contexto principal enxuto.

## Modelo da sessão principal

Troque com `/model` conforme a fase:

| Fase | Modelo sugerido |
|---|---|
| Planejar/especificar uma feature, decidir arquitetura | `opus` (ou `opusplan`: Opus no plan mode, Sonnet ao executar) |
| Implementar seguindo um plano aprovado | `sonnet` |
| Ajustes triviais, perguntas rápidas, comandos | `haiku` |

Fluxo típico de uma feature: `arquiteto` (ou sessão em Opus) escreve spec e plano → aprovação → `executor` implementa passo a passo → `validador` confere → `documentador` registra.

## Economia de tokens

- Uma conversa por tarefa: use `/clear` ao trocar de assunto e `/compact` em conversas longas.
- Aponte arquivos e linhas na pergunta em vez de pedir análise do repositório inteiro.
- Planos devem ser executáveis por um modelo menor: arquivos, comportamento e validação de cada passo.
- Mantenha `AGENTS.md` curto, porque ele entra em toda sessão; detalhes ficam em `docs/`.
- Não delegue tarefas triviais: cada subagente relê o contexto do zero, então para uma edição de uma linha é mais barato fazer direto.

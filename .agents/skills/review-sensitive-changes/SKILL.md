---
name: review-sensitive-changes
description: Avaliar impacto e validação de mudanças relevantes no schema PostgreSQL, autenticação ou busca OpenAI do catálogo de veículos, ou revisar essas áreas quando solicitado.
---

# Revisão de mudanças sensíveis

Leia `AGENTS.md`, a especificação aplicável e o diff/código relacionado. Use somente as verificações relevantes à mudança. A revisão deve produzir achados concretos, vinculados ao código e ao contrato esperado; não amplia o escopo de implementação.

## Persistência

Compare `backend/src/db/schema/`, SQL e metadados em `backend/src/db/migrations/`, schemas Zod e respostas HTTP. Verifique nulabilidade, comprimentos, defaults, precisão e compatibilidade com dados existentes. Hoje `price` aceita inteiro na API e é convertido para string para `numeric(12,2)`.

Examine risco de perda de dados, locks, backfill e recuperação quando aplicável. Não altere migrations históricas silenciosamente. A presença de uma migration não prova que foi aplicada. Não consulte banco real nem execute geração/aplicação de migrations como parte automática da revisão.

## Autenticação e exposição

Não há autenticação implementada no estado inicial. Para mudanças nessa área, verifique identidade, autorização por operação e casos de acesso negado. Considere `POST /cars`, a lista `CORS_ORIGINS`, escuta em `0.0.0.0` e mensagens internas em erros. Não descreva CORS como mecanismo de autenticação.

## OpenAI e busca

Confira coerência entre prompt, definição da tool, parser, filtros internos e query builder. Hoje somente marca, modelo e versão são implementados; ano e quilometragem aparecem apenas no texto do prompt.

Verifique ausência de tool, múltiplas calls, JSON inválido e argumentos rejeitados. Hoje falhas podem gerar filtros vazios e consultar todo o catálogo. Avalie limites de resultados, curingas `ILIKE`, envio de dados ao provedor e efeitos de falhas/custos conforme o contrato proposto. O texto do modelo nunca deve ser tratado como SQL confiável.

## Evidências e saída

Prefira mocks para OpenAI, testes de contratos e banco isolado para integração. Não leia segredos, faça chamadas pagas ou operações destrutivas para obter evidência sem autorização específica.

Para cada achado, informe local, cenário que o dispara, impacto e correção sugerida. Separe regressões da mudança de limitações preexistentes. Registre incertezas e validações ausentes; não apresente hipóteses como falhas confirmadas.

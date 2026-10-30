# Finanças e poupanças: especificação

> Especificação original da versão 1.3. A implementação atual simplifica alguns pontos: as categorias são texto livre (não há entidade `categories`), os orçamentos e objetivos estão associados a uma conta e não existe `financeAudit` separado. Ver [ARQUITETURA.md](ARQUITETURA.md).

## Objetivo
Introduzir um módulo opcional de gestão financeira doméstica, continuando a executar exclusivamente dentro do Home Assistant Green.

## Acesso
- Administrador: configuração e acesso a todos os registos financeiros.
- Gestor da casa: acesso apenas às contas e movimentos financeiros explicitamente partilhados.
- Morador: acesso apenas às contas pessoais e às contas explicitamente partilhadas consigo.
- Colaborador: **sem qualquer acesso ao módulo financeiro**, incluindo valores indiretos, relatórios, exportações e totais.
- Nunca enviar movimentos ou contas não autorizados em `/api/state`, nem depender apenas da ocultação visual.
- Invalidar sessões após mudança de perfil. Reavaliar autorizações a cada pedido no servidor.

## Modelo mínimo
- `accounts`: id, name, currency (EUR), kind (cash/bank/other), scope (private/shared), ownerId, allowedUserIds[], archived, createdAt.
- `categories`: id, name, kind (income/expense), ownerId|null, householdShared.
- `transactions`: id, accountId, kind, amountCents (inteiro), transactionDate, categoryId, description, createdBy, createdAt, updatedAt.
- `budgets`: id, month (YYYY-MM), categoryId|null, amountCents, ownerId, scope.
- `savingsGoals`: id, title, targetCents, savedCents, targetDate|null, ownerId, scope.
- `financeAudit`: id, actor, action, objectId, createdAt (sem detalhes pessoais ou valores no log).

## Regras
- Nunca usar números de ponto flutuante para valores monetários.
- Escopos privados prevalecem sobre funções de gestão, exceto administradores.
- Proibir referência a contas ou categorias fora do alcance do utilizador.
- Não incluir saldos em dados de demonstração real; apenas dados fictícios explícitos.
- O acesso ao módulo é opcional, não prejudica tarefas, compras e registos existentes.
- Exportação financeira separada e explicitamente autorizada, nunca incluída automaticamente no backup JSON de tarefas.
- Não guardar IBAN, credenciais bancárias, cartões ou acessos externos.
- Registos de despesas não enviam notificações para colaboradores.

## Interface desejada
- Resumo mensal: entradas, saídas e saldo, separado por contas acessíveis.
- Lançamento simples de despesa/receita com validação.
- Despesas recorrentes e categorias editáveis.
- Orçamentos por mês/categoria, objetivos de poupança e relatórios.
- Vista móvel responsiva com filtros por período e conta.

## Testes obrigatórios antes do lançamento
- Morador A não consegue consultar ou editar contas privadas de B.
- Gestor não vê contas privadas de outros moradores.
- Colaborador não obtém nenhum campo ou resumo financeiro.
- Valores só aceitam inteiros em cêntimos; valores negativos e fora de gama rejeitados.
- Actualizações inválidas não escrevem parcialmente dados.
- Contas arquivadas mantêm movimentos históricos e não permitem novos movimentos.
- Migração preserva os dados da 1.2.0; cópias de segurança continuam compatíveis.
- Interface testada no Home Assistant Green e em dispositivos móveis.

Estado: fase de implementação; **não instalar** antes de aprovação do controlo de acessos e testes de integração.

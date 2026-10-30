# 1.5.0 — Experiência integrada e nova identidade visual

- Dashboard com ações prioritárias, atribuídas e próximas do prazo.
- Formulário de tarefa simplificado com mais opções recolhíveis.
- Filtros de tarefas disponíveis a pedido, com limpeza rápida.
- Compras agrupadas por categoria e opção de visualizar apenas pendentes.
- Rotinas ordenadas por próxima ocorrência e resumo das vencidas.
- Ao concluir tarefa pontual, atalho para registar o trabalho realizado.
- Finanças com seleção do mês para consulta do resumo.
- Nova identidade minimalista integrada: logótipo vetorial horizontal, versões clara/escura e ícones PWA/HA.
- Sem migração de dados. Criar cópia de segurança do add-on antes da atualização.

# 1.3.4 — Correção de navegação e formulários no iPhone

- Corrige a direção vertical herdada que mostrava apenas um botão na navegação.
- Define largura fixa dos destinos e deslocamento horizontal dentro da barra.
- Substitui a aparência de foco azul por um foco dourado discreto, mantendo acessibilidade.
- Corrige estilo dos campos de pesquisa e dos formulários sem alterar dados.

# 1.3.3 — Navegação e formulários redesenhados

- Barra inferior deslizável para aceder a todas as funções sem menu Mais.
- Gestão individual de divisões e categorias, com edição, adição e remoção em lista.
- Corrigidos espaçamentos no painel, filtros, contornos de foco, formulários e alinhamentos.
- «Explorar espaços» é agora uma ação que abre a lista de tarefas.
- Dados existentes preservados; sem alteração da base de dados.

# 1.3.2 — Revisão visual e navegação móvel

- Nova navegação expansível na barra inferior preta, sem painel separado.
- A expansão mantém-se entre páginas para evitar cliques repetidos.
- Melhorias de legibilidade, foco, formulários e largura móvel.
- Sem alterações às tarefas e dados guardados.

# 1.3.1 — Ícone e logótipo no Home Assistant

- Usar `mdi:home-outline` na barra lateral do Home Assistant, em substituição de `mdi:home-check`, que não está disponível na coleção de ícones utilizada.
- Adicionar o logótipo da aplicação à página de detalhes no Home Assistant, com o símbolo visual já existente.
- Sem alterações à base de dados ou às funcionalidades da aplicação.

# 1.3.0 — Finanças domésticas

- Primeiro módulo de contas e movimentos em cêntimos, resumo mensal, orçamento e objetivos via API.
- Acesso financeiro negado a colaboradores e contas filtradas no servidor.
- Experimental: não instalar em produção.

# 1.2.0 — Trabalho em desenvolvimento

- Perfis de administrador, gestor, morador e colaborador com controlo de acesso no servidor.
- Tarefas privadas, lista de compras partilhada, registo de trabalhos e auditoria básica.
- Conservação de dados anteriores. Testes e revisão de permissões ainda pendentes.

# 1.1.1 — Correção de atualização da interface

- Corrigida a apresentação de código antigo após atualizações do Home Assistant, causada pela cache do service worker.
- Ficheiros JavaScript e CSS passam a ser revalidados, com versão no URL dos recursos.
- Mantidos dados e configuração persistentes em `/data` sem alterações de esquema.

# 1.1.0 — Candidata a lançamento

- Sugestões automáticas de divisão, prioridade e duração na criação de tarefas.
- Gestão de divisões e categorias nas definições.
- Subtarefas, objetivos semanais, tempos estimados e filtro «Tenho 15 minutos».
- Versão experimental: requer testes funcionais e revisão antes de ser lançada.

# Histórico de versões

## 1.0.1 — Preparação da instalação
- Acesso apenas via Ingress do Home Assistant; removida a porta 3037 publicada.
- Mantém os dados em `/data/casa.json`, separados do código.
- Sem alterações ao formato da base de dados da versão 1.0.0.

## 1.0.0 — 28-10-2026

- Primeira versão publicada para Home Assistant Green, com identidade visual editorial e Instrument Sans.
- Tarefas, rotinas, prioridades, divisões, responsáveis, estados e datas.
- Contas individuais, exportação JSON e **importação inicial privada** de tarefas.
- Persistência em `/data`, Ingress e acesso de rede local opcional.

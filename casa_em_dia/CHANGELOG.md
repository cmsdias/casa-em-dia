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

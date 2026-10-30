# Arquitetura

## Componentes

```text
Browser / iPhone / app Home Assistant
            │  HTTPS através do Ingress do Home Assistant
            ▼
  public/index.html + style.css + app.js     (interface, sem frameworks)
            │  fetch /api/*  (JSON + cookie de sessão + cabeçalho X-Casa-Request)
            ▼
  server.js  (node:http, porta interna 3000)  →  autorização por perfil e validação
            │  escrita atómica (.tmp + rename)
            ▼
  /data/casa.json                             (persistente, incluído nas cópias do HA)
```

A demonstração no GitHub Pages usa a mesma interface com `window.__CASA_DEMO__ = true`. Nesse modo não há servidor: os dados ficam no `localStorage` do browser.

## Stack

| Camada | Implementação |
| --- | --- |
| Interface | HTML, CSS e JavaScript sem frameworks; renderização por template strings em `app.js`. Letra Instrument Sans alojada em `public/fonts/` (sem pedidos externos). |
| Servidor | Node.js 22, apenas módulos nativos (`http`, `fs`, `crypto`). Sem dependências npm em produção. |
| Persistência | Um ficheiro JSON (`DATA_DIR/casa.json`). Valores monetários em cêntimos (inteiros). |
| Autenticação | Contas próprias, palavras-passe com scrypt e sal, sessão assinada com HMAC num cookie `HttpOnly; SameSite=Strict` (e `Secure` em HTTPS), válida 14 dias. |
| Contentor | `node:22-alpine`, processo sem privilégios (`su-exec node`), arquiteturas `aarch64` e `amd64`, Ingress do Home Assistant. |
| Testes | Integração em Node (`test-1.1.js`, `test-roles.js`, `test-finance.js`) e interface com Playwright/Chromium (`test-ui.js`). |

## Modelo de dados (`casa.json`)

| Chave | Conteúdo |
| --- | --- |
| `people` | Utilizadores: nome, utilizador, perfil, hash da palavra-passe, `authVersion` (invalida sessões). |
| `tasks` | Tarefas e rotinas: `kind` (`project`/`routine`), título, divisão, categoria, prioridade `P1`–`P4`, estado, responsável, prazo, repetição, duração estimada, subtarefas, visibilidade (`shared`/`private`), plano semanal. |
| `history` | Conclusões de tarefas (últimas 2000). |
| `shopping` | Produtos: quantidade, categoria, notas, comprado. |
| `workLogs` | Trabalhos realizados: data, minutos, descrição, pessoa, tarefa associada. |
| `finance` | `accounts`, `transactions`, `budgets`, `goals`. |
| `audit` | Registo de ações (últimas 3000), sem valores financeiros. |
| `settings` | Divisões e categorias. |
| `secret` | Chave de assinatura das sessões. |

No arranque, o servidor acrescenta as estruturas em falta, sem apagar nada, para aceitar ficheiros de versões anteriores.

## API

Todos os pedidos de escrita exigem o cabeçalho `X-Casa-Request: 1`. Isto obriga a um *preflight* CORS, que nunca é aceite, e bloqueia pedidos forjados a partir de outros sites.

| Grupo | Rotas |
| --- | --- |
| Sessão | `GET /api/bootstrap`, `POST /api/setup`, `POST /api/login`, `POST /api/logout` |
| Estado | `GET /api/state` (filtrado por perfil), `GET /api/export`, `POST /api/import`, `PATCH /api/settings` |
| Tarefas | `POST /api/tasks`, `PATCH`/`DELETE /api/tasks/:id`, `POST /api/tasks/:id/complete` |
| Compras | `POST /api/shopping`, `PATCH`/`DELETE /api/shopping/:id` |
| Trabalhos | `POST /api/worklogs` |
| Pessoas | `POST /api/people`, `PATCH /api/people/:id/role`, `POST /api/people/:id/password` |
| Finanças | `GET /api/finance`, `POST /api/finance/accounts`, `PATCH /api/finance/accounts/:id`, `POST /api/finance/transactions`, `/budgets`, `/goals` |
| Diagnóstico | `GET /health` |

## Proteções do servidor

- A autorização é verificada em cada pedido. A interface só esconde o que o servidor já recusa.
- Tentativas de login limitadas a 8 falhas por utilizador em 10 minutos. Verificação em tempo constante, também para utilizadores inexistentes.
- Corpo dos pedidos limitado a 256 KB. Datas validadas como datas reais.
- Ficheiros estáticos servidos apenas de `public/`, com `Content-Security-Policy` e `X-Content-Type-Options`.
- Um erro num pedido não termina o processo. `SIGTERM` (paragem pelo Supervisor) encerra de forma limpa.
- Se `casa.json` estiver danificado, o servidor não arranca e não sobrescreve o ficheiro.

## Interface

- `app.js` contém o estado, a renderização das páginas, os formulários e o cliente da API.
- `style.css` é organizado por camadas históricas. A navegação móvel, o botão **+** e o menu de criação rápida estão num **bloco único no fim do ficheiro**; é aí que devem ser feitas as alterações.
- `sw.js` (service worker) é registado apenas na versão com servidor. Guarda a interface em cache para abrir mais depressa e mostrar o ecrã mesmo com rede instável; o JavaScript e o CSS vêm sempre primeiro da rede. **Não há escrita offline**: guardar alterações exige ligação ao Home Assistant. Ao mudar de versão, a constante `VERSION` em `sw.js` tem de mudar para limpar a cache antiga.
- Ícones PNG gerados com `build_brand.py`; logótipos SVG gerados com `build_logo_vectors.py`.

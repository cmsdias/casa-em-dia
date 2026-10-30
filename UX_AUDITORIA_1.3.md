# Casa em Dia — Auditoria UX/UI e redesign experimental

**Base analisada:** código do Casa em Dia 1.3.0 (`public/app.js`, `style.css`, `index.html`). 
**Objetivo:** interface contemporânea, minimalista, legível, responsiva em desktop e iPhone, mantendo a lógica e os dados existentes. 
**Estado:** revisão de código e implementação inicial; não substitui testes manuais no iPhone/VoiceOver, nem certifica conformidade WCAG.

## Diagnóstico por área

| Área | Problema observado no código existente | Impacto | Solução |
|---|---|---|---|
| Dashboard | Acumulação de saudação, plano semanal, atalhos, hero editorial, números e cartões de destaque | P1 · sobrecarga cognitiva | Hierarquia mais curta: plano semanal e próximas ações primeiro; reduzir a ênfase decorativa dos blocos secundários |
| Navegação | Até oito itens renderizados na barra inferior móvel | P0 · alvos estreitos/overflow | Cinco ações estáveis (Painel, Tarefas, Rotinas, Compras, Mais); restantes secções num menu secundário |
| Tarefas | Muitas informações e controlos na mesma linha | P1 · densidade excessiva em ecrãs pequenos | Tipografia e metadados mais legíveis, alvos de toque maiores, texto a truncar apenas quando adequado |
| Rotinas | Cartões com hierarquia visual variável e botões pequenos | P1 | Consistência de margens, foco, estados e áreas mínimas de toque |
| Compras | Formulário em linha rígido e checkbox com pouco destaque | P1 | Campos maiores, listagem a adaptar-se ao iPhone, checkbox nativo ampliado |
| Pessoas | Cartões densos e selector de papel na mesma linha | P1 | Espaçamento/legibilidade; ações de administrador continuam condicionadas por permissões |
| Trabalhos | Formulário de data, minutos e descrição pouco responsivo | P1 | Formulários a ocupar a largura no iPhone e labels legíveis |
| Finanças | Formulários longos e totais monetários sem uma linguagem visual própria | P1 | Campos de pelo menos 44 px, valores tabulares e maior legibilidade; dados de teste separados |
| Definições | Texto secundário com contraste fraco e inputs compactos | P1 | Contraste dos tokens, tipografia de 15–16 px e foco visível |

## Auditoria transversal de acessibilidade

| Achado | Referência WCAG 2.2 AA / boa prática | Gravidade | Tratamento |
|---|---|---|---|
| `outline:0` global em inputs/selects | 2.4.7 Focus Visible; 2.4.11 Focus Not Obscured | Alta | `:focus-visible` com contorno explícito e offset |
| Controlos de 32–39 px e navegação móvel sobrecarregada | 2.5.8 Target Size (Minimum); recomendação de 44×44 px | Alta | Botões e ações principais com altura mínima de 44 px |
| Body de 14 px; textos auxiliares 10–12 px | 1.4.4 Resize Text / legibilidade | Média/alta | Base 15 px, labels e metadados revistos; 16 px em campos iOS |
| Texto secundário demasiado claro em fundo branco | 1.4.3 Contrast (Minimum) | Alta | Tokens de texto escurecidos; **verificar rácios finais em browser** |
| Labels apresentados sem `for` ou associação nos campos dinâmicos | 1.3.1 Info and Relationships; 3.3.2 Labels or Instructions | Alta | Associar `label[for]` ao campo e adicionar nomes acessíveis onde falta label |
| Menu secundário móvel sem gestão de foco | 2.1.1 Keyboard; 2.4.3 Focus Order | Média/alta | Foco transferido para primeira ação; Escape fecha e devolve foco |
| Animações de hover e scroll suave | 2.3.3 Animation from Interactions / `prefers-reduced-motion` | Média | Desativar transições e animações quando pedido pelo utilizador |
| Feedback de erros apenas por toast | 4.1.3 Status Messages; 3.3.1 Error Identification | Média | Toast com região de estado existente; próxima revisão deve associar erros aos campos e testar leitores de ecrã |

## Design system definido

- **Paleta:** base off-white `#f7f8f5`, verde profundo `#24352a`, texto `#202c25`, texto secundário `#606d64`, linha `#e0e6dd`, dourado discreto `#d6af61`.
- **Tipografia:** Instrument Sans; corpo 15 px e títulos responsivos; campos de formulário de 16 px no iPhone.
- **Espaçamento:** sistema de 8 px (8/16/24/32), cartões de 16 px de raio, controlo de espaços na versão móvel.
- **Componentes:** botões de 44 px ou mais, focus ring de 3 px, estados hover/active/focus/disabled, listas legíveis, controlos acessíveis.
- **Navegação móvel:** cinco entradas principais e menu «Mais» para Pessoas, Trabalhos, Finanças e Definições.
- **Dados:** modo de demonstração independente e exclusivamente com exemplos fictícios; servidor real e persistência não são alterados por este redesign.

## Implementação incluída nesta branch

1. Tokens visuais e tipografia revistos sem substituir o HTML/JavaScript funcional.
2. Regras de foco, toque, motion reduction e estrutura responsiva.
3. Navegação móvel simplificada, com menu acessível via teclado e botão Escape.
4. Associação automática de labels dos formulários e nomes acessíveis de reserva.
5. Demonstração separada da versão instalada, incluindo dados fictícios de compras, trabalho e finanças.

## Validação obrigatória antes de integrar na aplicação real

- Verificar Safari no iPhone (375/390/430 px), Chrome e Safari desktop, rotação e zoom a 200%.
- Testar navegação com Tab/Shift+Tab, VoiceOver, contraste real de textos/ícones e estados de erro.
- Verificar modais longos, scroll, teclado iOS, painéis financeiros e alteração de perfis.
- Confirmar que os endpoints, autorizações e persistência existentes se mantêm intactos.
- Resolver bugs visuais apontados pelo utilizador na pré-visualização antes de integrar a branch em `main`.

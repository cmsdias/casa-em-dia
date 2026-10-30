# Guia de testes antes de cada atualização

Use primeiro a demonstração em **https://cmsdias.github.io/casa-em-dia/next/**: tem dados fictícios guardados apenas no browser e não altera o Home Assistant. Depois de instalar a versão no Home Assistant, repita os pontos marcados com **(HA)**.

Não introduza dados reais na demonstração, sobretudo financeiros.

## Testes automáticos (GitHub Actions)

Em cada pull request correm, automaticamente:

- `npm run check`: sintaxe de todos os ficheiros JavaScript.
- `npm test`: servidor, autenticação, perfis, tarefas privadas, compras, trabalhos e finanças.
- `npm run test:ui`: interface em Chromium (390×844 e 1440×900), sem scroll horizontal e com navegação funcional.

O Chromium **não** substitui o Safari/WebKit. Os pontos abaixo são feitos à mão, no iPhone.

## iPhone (Safari e app Home Assistant)

- [ ] A barra inferior está encostada ao fundo, respeita a zona do indicador inicial e não corta texto.
- [ ] A barra desliza horizontalmente até *Definições*. O destino ativo fica visível ao mudar de página.
- [ ] A página nunca tem scroll horizontal.
- [ ] O botão **+** abre e fecha o menu, que mostra apenas opções autorizadas (colaborador sem *Despesa ou receita*).
- [ ] Criar a partir do **+**: tarefa, rotina, produto de compras, trabalho realizado e movimento financeiro. Recarregar e confirmar que ficaram guardados.
- [ ] O logótipo aparece em SVG no cabeçalho e no ecrã de entrada, com a variante correta (clara/escura).
- [ ] Os formulários não fazem zoom ao tocar nos campos e o teclado não esconde o botão *Guardar*.

## Desktop

- [ ] Percorrer todas as secções pela barra lateral e redimensionar a janela até à largura de telemóvel.
- [ ] Criar, editar, concluir e reabrir uma tarefa. Concluir uma rotina e confirmar o reagendamento.
- [ ] Compras: adicionar com categoria, marcar como comprado, alternar *Por comprar*/*Todas*.
- [ ] Finanças: mudar de mês e confirmar que os totais se atualizam.

## Perfis **(HA)**

- [ ] Entrar com uma conta de **colaborador**: não vê *Finanças* nem tarefas de outras pessoas que não lhe estejam atribuídas.
- [ ] Entrar com um **morador**: não consegue atribuir tarefas a outras pessoas.
- [ ] Mudar o perfil de alguém termina a sessão dessa pessoa.

## Depois de atualizar no Home Assistant **(HA)**

- [ ] *Definições* mostra a versão nova.
- [ ] Tarefas, rotinas, compras, trabalhos, pessoas e finanças continuam presentes.
- [ ] Reiniciar o add-on não perde dados.
- [ ] Os registos do add-on não mostram erros.

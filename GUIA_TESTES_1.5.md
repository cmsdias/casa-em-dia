# Casa em Dia — Guia de testes 1.5.0 beta

**Ligação:** https://cmsdias.github.io/casa-em-dia/next/

Demonstração com dados fictícios. Alterações guardadas apenas neste navegador. Não modifica a aplicação instalada no Home Assistant Green.

## O que deve estar diferente

1. **Painel:** abre com «O que importa agora» e até três tarefas recomendadas, com opção de concluir e aceder aos detalhes. As secções puramente promocionais foram removidas para reduzir a rolagem.
2. **Tarefas:** os filtros estão recolhidos por predefinição, com botão «Filtros» e «Limpar». Ao criar uma tarefa nova, só o título aparece inicialmente; «Mais opções» revela os campos avançados. A edição de tarefas existentes continua completa.
3. **Rotinas:** resumo com número de rotinas vencidas/para hoje e ordenação pela próxima data, preservando a conclusão e o reagendamento.
4. **Compras:** alternar «Por comprar»/«Todas», categorias visíveis e categoria selecionável ao adicionar novos produtos.
5. **Trabalhos:** resumo de registos e duração acumulada. Depois de concluir uma tarefa pontual, opção imediata «Registar trabalho», que abre a ficha já relacionada com a tarefa.
6. **Pessoas:** botão «Ver tarefas» em cada cartão para filtrar pelo respetivo responsável. Colaboradores não devem ver a navegação para Finanças.
7. **Finanças:** seleção do mês no topo, resumo financeiro atualizado para o período selecionado, mantendo contas e orçamentos existentes.
8. **Navegação:** barra inferior horizontal e deslizável no iPhone; desktop mantém barra lateral.
9. **Definições:** gestor de divisões/categorias da versão anterior mantido.

## Verificação antes de instalar no Home Assistant

- iPhone 375–430 px: deslizar a barra de navegação, tocar nos destinos e verificar que não surge scroll horizontal na página.
- Tarefas: escrever título, usar «Mais opções», guardar, editar, concluir e criar registo de trabalho.
- Compras: adicionar produto com categoria, marcar comprado, alternar a lista e verificar a persistência após recarregar.
- Rotinas: concluir e confirmar reagendamento.
- Finanças: mudar mês e confirmar que os totais se atualizam.
- Pessoas: atribuir tarefa e usar «Ver tarefas».
- Desktop: navegar por todas as secções, abrir e fechar formulários, redimensionar a janela.
- Não utilizar dados reais nesta demonstração, especialmente informação financeira.

## Estado

Em desenvolvimento isolado na branch `feature/1.5-product-experience`. A versão **1.3.4** instalada no HA não é alterada por esta demonstração. A integração na versão principal fica dependente da revisão visual e dos testes.

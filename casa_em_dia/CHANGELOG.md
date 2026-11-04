# 2.1.3 — Interruptor de aparência

- A aparência (no perfil e em Definições › Aparência) passa a um interruptor compacto com três símbolos: automático (meio círculo), claro (sol) e escuro (lua). O modo escolhido aparece por extenso ao lado.

# 2.1.2 — Ícone do Equilíbrio da casa

- O Equilíbrio da casa passa a ter um ícone próprio (balança), distinto do de Pessoas.

# 2.1.1 — Animação de abertura

- A animação de abertura deixa de ser cortada a meio: quando aparece, corre até ao fim (símbolo, ponto dourado e nome) e só depois desvanece. Se a app abrir em menos de 0,3 s, continua a não aparecer.

# 2.1.0 — Aprovações e arrumação dos estilos

- **Moradores podem pedir para atribuir tarefas a colaboradores.** A tarefa fica por atribuir, com o pedido à vista, até um administrador ou gestor aprovar; o colaborador só a vê depois de aprovada. Quem pediu pode retirar o pedido e é avisado da decisão.
- **Aprovação do trabalho dos colaboradores (opcional).** Quando ligada, as tarefas que um colaborador conclui ficam «Por aprovar»; o administrador ou o gestor aprova (entra no histórico em nome de quem fez) ou devolve (a tarefa volta à lista do colaborador, com aviso).
- As duas regras ligam-se e desligam-se em **Definições › A casa › Regras da casa**. Ao desligar a aprovação do trabalho, as tarefas pendentes voltam à lista.
- Em «Hoje», o administrador e o gestor têm o cartão **Para aprovar**; na ficha da tarefa aparecem os botões Aprovar / Devolver / Recusar.
- Estilos arrumados (`tidy_css.py`): 368 declarações que nunca chegavam a ser aplicadas foram retiradas e as cores e medidas passaram para um único bloco de tokens no início do ficheiro. Verificado em 84 capturas (claro/escuro, telemóvel/computador): aspeto idêntico.

# 2.0.0 — Nova navegação, «Hoje», equipamentos e documentos

Revisão completa da organização da app, a partir da análise «atual vs proposto».

**Navegação e páginas**
- Barra com quatro destinos: **Hoje · Tarefas · + · Compras · Casa**. O que se usa menos (Calendário, Equilíbrio, Equipamentos, Finanças, Pessoas, Registo de horas, Definições) está em **Casa**, com o estado de cada secção à vista. No computador, a barra lateral mostra o mesmo.
- **Hoje** substitui o Painel: saudação com o progresso do dia, a semana numa tira de sete dias, atrasadas e para hoje (as tuas e as por atribuir, ou toda a casa), compras e os trabalhos sazonais do mês.
- **Plano do dia**: «Tenho 15 min / 30 min / 1 hora» escolhe as tarefas mais urgentes que cabem nesse tempo.
- **Tarefas** numa só página com quatro vistas: Lista, Rotinas, Calendário e Divisões. A lista está agrupada por quando (Atrasadas, Hoje, Esta semana, Mais tarde, Sem data), com filtros rápidos (Minhas, Por atribuir, Urgentes, Até 30 min). A prioridade aparece em palavras (Urgente, Importante) em vez de P1–P4; a estrela do plano semanal deu lugar ao grupo «Esta semana».
- **Estado das divisões**: percentagem «em dia» de cada divisão, calculada a partir das rotinas e das tarefas atrasadas, e a média da casa.
- **Definições** em índice: A casa, Notificações e Home Assistant, Dados e cópias, Aparência, Sobre.
- «Trabalhos realizados» passa a **Registo de horas**.

**Funções novas**
- **Criar por escrita natural**: «Trocar lâmpada amanhã @Ana #Hall !urgente 20 min». A app reconhece datas (hoje, amanhã, sexta, dia 12, 15/11, fim do mês, daqui a 3 dias), pessoas, divisões, prioridade, repetição («todas as semanas», «todas as sextas») e duração, e mostra-as como etiquetas que se podem tirar ou acrescentar. «Mais detalhes» abre o formulário completo já preenchido.
- **Equilíbrio da casa**: tempo estimado de cada pessoa na semana (feito e por fazer), sem pontos nem classificação, com sugestão de reatribuição quando há desequilíbrio.
- **Equipamentos e documentos**: caldeira, AC, eletrodomésticos, rega… com marca, modelo, garantia, técnico e documentos (PDF ou fotografia até 8 MB, guardados no servidor da casa). Trinta dias antes de cada revisão é criada a tarefa «Revisão: …» e o administrador e o gestor são avisados; concluir a tarefa marca a próxima revisão. Avisos de garantias a terminar.
- **Modo loja** nas Compras: lista em letra grande pela ordem dos corredores, com o ecrã sempre ligado.
- **Assistente de início** para instalações novas (tipo de casa, divisões e rotinas sugeridas); também disponível em Definições › A casa.
- **Sem rede**: a app abre com os últimos dados guardados no dispositivo; concluir tarefas e mexer nas compras fica em fila e é enviado quando a ligação voltar.
- **Cartão para o painel do Home Assistant** (Definições › Notificações e Home Assistant) e dois sensores novos: `sensor.casa_em_dia_hoje` e `sensor.casa_em_dia_estado_da_casa`.

**Correções**
- Ler as Finanças já não altera a revisão dos dados (antes, abrir as Finanças fazia todos os dispositivos recarregar).
- Texto secundário com mais contraste (acessibilidade AA).
- A página mantém a posição ao atualizar com alterações de outras pessoas.

# 1.8.4 — Ícone na barra lateral

- Ícone da app na barra lateral do Home Assistant passa a `mdi:home-variant-outline`.

# 1.8.3 — Histórico de notificações

- «Limpar» no sino passa a tirar as notificações do sino sem as apagar. No fundo do sino, «Ver todas» abre a página com as notificações dos últimos 30 dias (incluindo as limpas), agrupadas por dia. As notificações apagam-se sozinhas ao fim de 30 dias.

# 1.8.2 — Avisos e telefone

- Avisos flutuantes («Produto adicionado», «Tarefa concluída»…): no telemóvel aparecem acima da barra de navegação, com folga em relação ao botão «+», e com fundo claro para não se confundirem com a barra.
- Telefone com indicativo do país numa lista com bandeiras (Portugal +351 por omissão), no perfil e na edição de pessoas.

# 1.8.1 — Correção

- Notificações no telemóvel: passam a abrir a Casa em Dia pelo mesmo endereço da entrada na barra lateral do Home Assistant (o endereço anterior podia mostrar «You're disconnected»).

# 1.8.0 — Notificações, perfil completo, modo escuro e animações

- Sino de notificações junto ao avatar, com contador: tarefa atribuída a ti, tarefa que criaste concluída por outra pessoa, «é a tua vez» nas rotações, aniversários (no dia e na véspera), tarefas para hoje e atrasadas (uma vez por dia) e calendário da casa no início de cada mês. Tocar abre a tarefa ou a página; «Marcar todas como lidas» e «Limpar». As tarefas privadas nunca geram avisos para outras pessoas.
- Perfil: nome de utilizador (para entrar) pode ser alterado, data de nascimento, email e telefone. Contactos visíveis só para o próprio, administrador e gestores; os restantes veem apenas o dia e o mês do aniversário. Colaboradores não veem aniversários.
- Calendário passa a vista de mês: tarefas com data (atrasadas a vermelho), próximas ocorrências das rotinas, aniversários e feriados (nacionais, incluindo os móveis, São João no Porto, Carnaval e vésperas de Natal e de Ano Novo), calculados na app. Filtros «Tudo», «Só eu» e por pessoa; tipos de evento ligáveis. Tocar num dia mostra a lista e permite criar uma tarefa nesse dia. Os trabalhos sazonais passam a «Sugestões» do mês, por baixo. Colaboradores veem o calendário com as suas tarefas e os feriados.
- Pessoas: o administrador pode editar fotografia, nome, utilizador, nascimento e contactos de qualquer pessoa; os cartões mostram aniversário, telefone e email (para quem os pode ver).

- Modo escuro: no perfil, «Aparência» com Automático (segue o telemóvel/computador), Claro ou Escuro. A escolha fica guardada em cada dispositivo. As cores escuras são geradas a partir do `style.css` por `build_dark.py` (voltar a correr depois de mudar estilos).
- Perfil num só formulário: fotografia, nome e (opcional) nova palavra-passe, com um único «Cancelar / Guardar». A fotografia escolhida só é gravada ao guardar. Mudar a palavra-passe já não obriga a voltar a entrar.

- Abertura da app: o símbolo da casa desenha-se num só traço e o ponto dourado acende-se. Só aparece se o arranque demorar mais de 0,3 s.
- Páginas a carregar (Finanças, cópias de segurança, Home Assistant, fotografias a enviar): esqueletos com brilho em vez de «A carregar…». Abrir as Finanças já não espera pelos dados para mudar de página.
- Botões a guardar: três pontos dourados e botão bloqueado até terminar (evita toques duplos).
- Linha dourada no topo enquanto a app vai buscar dados em segundo plano.
- Com «reduzir movimento» ativo no telemóvel, as animações ficam paradas.
- Aviso «Tarefa concluída!»: o botão de fechar (×) estava invisível (círculo branco); passa a ver-se e o aviso desaparece sozinho ao fim de 10 segundos.
- Tarefas: «Limpar» passa a «Limpar filtros», para não se confundir com «Limpar concluídas».
# 1.7.2 — Correção

- Notificações no telemóvel: tocar abria um endereço temporário do Home Assistant que dava erro. Passam a abrir a app Casa em Dia no painel do Home Assistant.


# 1.7.1 — Correções

- Fotografia do perfil e fotografias das tarefas: a janela de recorte/redimensionamento não abria na app instalada (a política de segurança bloqueava a pré-visualização da imagem escolhida). Corrigido.
- Tarefas → Concluídas: novo botão «Limpar concluídas» (administrador), com confirmação. Apaga só as tarefas pontuais concluídas; as rotinas e o histórico de conclusões mantêm-se.

# 1.7.0 — Fiabilidade, calendário da casa, Finanças simplificadas e Home Assistant

**Fiabilidade**
- Cópias de segurança automáticas: uma por dia (ficam 14) e outra antes de cada atualização de versão, em `/data/backups`. Em Definições, o administrador cria, descarrega, carrega e restaura cópias; antes de restaurar, o estado atual é guardado.
- Atualização automática entre pessoas: as alterações das outras pessoas aparecem em poucos segundos. Se estiveres a escrever ou com uma janela aberta, a app avisa e espera.

**Novas funcionalidades**
- Calendário da casa: 23 trabalhos sazonais (jardim, terraço, alpendre, manutenção), editáveis, com «Criar tarefa» para o mês. O Painel mostra os do mês atual.
- Compras rápidas: escrever «2 leite, 0,5 kg queijo, detergente» acrescenta vários produtos com quantidade, unidade e categoria automática; compras habituais com um toque; «Limpar comprados».
- Unidades nos produtos (un, kg, g, L, ml, pacote, embalagem, garrafa, lata, caixa, saco, frasco, rolo, dúzia, molho). Tocar na quantidade abre a edição (quantidade com − e +, unidade, nome, categoria, notas); qualquer pessoa pode acertar a quantidade e a unidade.
- Rotinas com rotação entre pessoas, por ordem definida (setas ou arrastar): a 1.ª fica responsável agora e, ao marcar como feita, passa à seguinte. Novas repetições trimestral e anual.
- Fotografias nas tarefas (até 8, antes/depois), com a mesma privacidade da tarefa.

**Finanças (reformuladas)**
- Só para administrador e gestor; moradores e colaboradores deixam de as ver.
- Resumo, Despesas (só as grandes: obras, mobiliário, equipamentos…), Despesas fixas lançadas automaticamente todos os meses, e Património (contas, depósitos, poupança, investimentos, cofre) com total global e evolução.
- Itens do património privados («só eu») ou partilhados; orçamento anual da casa; objetivos de poupança ligados ao património.
- As contas da versão anterior passam automaticamente a itens do património, com o saldo calculado.

**Home Assistant (opcional, desligado por omissão)**
- Notificações para a app de cada pessoa (tarefa atribuída, resumo diário).
- Sensores `sensor.casa_em_dia_*` e criação de tarefas/compras a partir de automações, com token próprio.

**Interface**
- Janelas flutuantes: o conteúdo desliza dentro da janela e o cabeçalho, com o título e o ×, fica fixo, por isso dá sempre para fechar. Tocar fora da janela também fecha (pede confirmação se já houver alterações escritas).
- Secções que abrem e fecham (detalhes da tarefa, permissões, listas recolhidas) usam o mesmo sinal + / −.
- A rotação só aparece nas rotinas; as fotografias só depois de a tarefa ser guardada.

**Técnico**
- Lógica das finanças e calendário partilhada entre servidor e demonstração (`public/finance-core.js`, `public/seasonal-defaults.js`); funcionalidades novas da interface em `public/features.js` e `public/finance-ui.js`.
- Novos testes `test-1.7.js`; `test-finance.js` reescrito.
- Ferramenta `scripts/publicar.sh` para o repositório público de distribuição (ver `documentacao/DISTRIBUICAO_PRIVADA.md`).

# 1.6.0 — Revisão de usabilidade e interface

- Ícones revistos: Painel (casa), Tarefas (lista com pontos), Rotinas (repetição), Compras (carrinho), Trabalhos (caixa de ferramentas); ações Adicionar, Concluir, Editar, Pesquisar, Exportar, Abrir e Prioritárias com novos desenhos. O menu «+» usa os mesmos ícones da navegação.
- Tarefas atrasadas destacadas a vermelho na lista e no painel.
- Datas legíveis em português (ex.: «28 out») nos trabalhos, movimentos e orçamentos; meses por extenso.
- Painel mais curto: removida a secção «Por onde começar?», que repetia as tarefas do topo.
- Rotinas com filtros recolhidos (como em Tarefas) e cartões mais compactos.
- Pessoas: nome, perfil e ações sem texto cortado em desktop e telemóvel.
- Compras: formulário compacto no telemóvel e quantidade destacada em cada produto.
- Botão «+» de criação rápida também disponível no desktop.
- Logótipo no ecrã de entrada do telemóvel.
- Logótipo clicável: regressa ao Painel (telemóvel e computador).
- Ilustrações das divisões (estilo editorial) escolhidas pela divisão e não pela tarefa: novas cenas para Sala, Alpendre (zona pavimentada com mesa de jantar, sofá lounge e guarda-sol), Hall de entrada, Corredor, Quarto Nascente, Quarto Poente, Quarto Principal, WC com duche, Terraço e Garagem.
- Pisos: em Definições, lista de pisos e piso de cada divisão. O Painel ordena as divisões por piso e mostra o piso em cada cartão; os filtros agrupam as divisões por piso. Nomes como «Corredor (Piso 0)» aparecem só como «Corredor» dentro do piso.
- Nova navegação no telemóvel: Painel, Tarefas, «+» central, Compras e «Mais» (Rotinas, Pessoas, Trabalhos, Finanças, Definições e Perfil). O «+» deixa de flutuar por cima das listas.
- Perfil numa janela flutuante com botão de fechar (botão no canto superior direito, que mostra a fotografia quando existe; no computador, também o cartão da barra lateral): fotografia, nome, palavra-passe e terminar sessão.
- Ecrã de entrada no telemóvel com faixa verde, logótipo e mensagem; formulário em cartão por baixo.
- Janelas no telemóvel (perfil, formulários) em cartão flutuante com margem em volta, como o menu do «+»; cabeçalho com o X sempre visível ao percorrer.
- Confirmações curtas (eliminar tarefa, desativar conta, mudar perfil, importar, repor demonstração) numa janela centrada própria, em vez do aviso do browser.
- Fotografia de perfil com janela de recorte: arrastar para posicionar e aproximar com o controlo ou com dois dedos, antes de guardar.
- Segurança: alterar a própria palavra-passe passa a exigir a palavra-passe atual.
- Contas desativáveis: o administrador desativa ou reativa uma pessoa (dois toques para confirmar). A conta deixa de entrar e as sessões terminam. As tarefas por concluir ficam por atribuir e voltam à pessoa se a conta for reativada (exceto as que entretanto foram atribuídas a outra pessoa). O histórico mantém-se.
- Palavra-passe temporária: contas criadas ou repostas pelo administrador obrigam a escolher uma nova palavra-passe na primeira entrada.
- Tarefas privadas passam a ser visíveis apenas para quem as criou, incluindo para o administrador (lista, exportação e histórico).
- Pessoas: tabela «O que cada perfil pode fazer».
- Colaboradores com dias de acesso (ex.: terças e sextas); fora desses dias não conseguem entrar.
- Trabalhos: resumo mensal de horas por pessoa.
- Puxar para atualizar no telemóvel («Puxar para atualizar» → «Largar para atualizar» → «A atualizar…»), em vez do botão no canto superior direito.
- Os formulários rápidos já não abrem o seletor de data automaticamente.
- Letra Instrument Sans incluída na aplicação: sem pedidos ao Google e com aspeto correto mesmo sem Internet.
- Acessibilidade: rótulos nos campos de compras, foco visível no botão «+» e na navegação.
- Marca afinada: cores unificadas (verde #17261E, branco #F8F7F2, dourado #C9A568) nos logótipos, ícones e superfícies escuras da interface; espaço entre «CASA» e «EM DIA»; símbolo reforçado e simplificado para tamanhos pequenos.
- Ícone da app em quadrado cheio: deixa de aparecer um rebordo escuro nos cantos no ecrã inicial do iPhone.
- Imagens da ficha do add-on no Home Assistant atualizadas (ícone e logótipo com nome).
- Sem migração de dados. Criar cópia de segurança do add-on antes da atualização.

# 1.5.1 — Navegação móvel, criação rápida e logótipo vetorial

- Logótipo horizontal em SVG no cabeçalho móvel e no ecrã de login, em vez de lettering recriado em HTML/CSS.
- Barra inferior móvel encostada ao fundo do ecrã, com deslizamento horizontal preservado, espaçamentos uniformes e área segura do iPhone.
- Botão flutuante "+" com menu de criação rápida: tarefa, rotina, produto de compras, trabalho realizado e movimento financeiro (apenas para perfis autorizados).
- Gradientes suaves e microinterações CSS, com respeito por `prefers-reduced-motion`.
- Versão e cache do service worker atualizados.
- Corrigido: um endereço com codificação inválida (ex.: `/%E0%A4%A`) terminava o servidor.
- Datas de prazo e de trabalhos validadas como datas reais; manifesto PWA servido com o tipo correto.
- Login: limite de 8 tentativas falhadas por utilizador em 10 minutos e verificação em tempo constante.
- Paragem limpa do add-on (SIGTERM) e mensagem clara se `casa.json` estiver danificado, sem o sobrescrever.
- CSS da navegação móvel consolidado num único bloco; removidas regras de componentes já inexistentes (78 KB → 61 KB), sem alterações visuais.
- Repositório limpo: documentação atualizada em `documentacao/`, ficheiros e workflows obsoletos removidos, `.gitignore` para dados privados.
- Sem migração de dados. Criar cópia de segurança do add-on antes da atualização.

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

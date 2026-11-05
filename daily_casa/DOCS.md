# Daily Casa

Aplicação para organizar a casa em conjunto: tarefas pontuais, rotinas recorrentes, lista de compras, equipamentos e documentos da casa, registo de horas e finanças domésticas.

## Vem da «Casa em Dia»?

A 3.0.0 é um add-on novo (`daily_casa`). Os dados passam com uma cópia de segurança: no add-on antigo, *Casa → Definições → Cópias de segurança* → criar e descarregar; parar o antigo; instalar o Daily Casa (repositório `https://github.com/cmsdias/daily-casa`); criar uma conta provisória; **Carregar ficheiro** → **Restaurar**; entrar com a conta de sempre; desinstalar o antigo. Os sensores passam a `sensor.daily_casa_*`.

## Como está organizada

- **Hoje**: o que há para fazer hoje e o que está atrasado, a semana, as compras. «Tenho 15 min / 30 min / 1 hora» sugere as tarefas que cabem nesse tempo.
- **Tarefas**: lista agrupada por quando, rotinas, calendário do mês e estado de cada divisão.
- **+**: criar uma tarefa numa linha (ex.: «Trocar lâmpada amanhã @Ana #Hall !urgente 20 min»), uma rotina, um produto, um registo de horas, uma despesa ou um equipamento.
- **Compras**: lista partilhada e modo «na loja».
- **Casa**: calendário, ocorrências (algo partiu, avariou ou falta, com fotografias), equilíbrio da casa, equipamentos, finanças, pessoas, registo de horas e definições.

## Primeiro acesso

1. Inicie a aplicação e abra **Abrir interface Web** (ou o item **Daily Casa** na barra lateral).
2. Crie a conta de administrador com o seu nome e email. Use uma palavra-passe longa (mínimo 10 caracteres) e diferente da do Home Assistant.
3. O **assistente de início** propõe divisões e rotinas para o tipo de casa (pode voltar a abri-lo em **Definições → A casa**).
4. Em **Casa → Pessoas**, crie (com nome, email e palavra-passe temporária) as contas das restantes pessoas da casa e atribua o perfil adequado.
5. Opcional: em **Definições → A casa**, ajuste as divisões e categorias e importe uma lista de tarefas em JSON.

## Perfis

| Perfil | O que pode fazer |
| --- | --- |
| Administrador | Tudo: contas, perfis, definições, cópias de segurança, Home Assistant, importação/exportação, todas as tarefas partilhadas e as Finanças. |
| Gestor | Gerir tarefas partilhadas, atribuir tarefas e rotações, alterar divisões, categorias e o calendário da casa. Finanças. |
| Morador | Ver tarefas partilhadas, gerir as suas e concluir as que lhe foram atribuídas. Pode pedir para atribuir tarefas suas a colaboradores (precisa de aprovação). Sem acesso às Finanças. |
| Colaborador | Apenas tarefas que criou ou que lhe foram atribuídas. Sem acesso às finanças. Se a regra estiver ligada, o que conclui fica «Por aprovar». |

As permissões são verificadas no servidor em cada pedido, não apenas escondidas na interface. Ao mudar o perfil ou a palavra-passe de alguém, as sessões dessa pessoa terminam.

- **Tarefas privadas** só são visíveis para quem as criou, incluindo para o administrador.
- **Entrar:** cada pessoa entra com o seu email. Contas antigas sem email continuam a entrar com o nome de utilizador até acrescentarem o email no perfil.
- **Esqueci-me da palavra-passe:** é enviado um código de 6 dígitos para a app Home Assistant do telemóvel da pessoa (se o administrador lhe tiver ligado o telemóvel) e o administrador é avisado no sino; também pode repor a palavra-passe em Pessoas.
- **Contas novas e palavras-passe repostas** pelo administrador são temporárias: na primeira entrada, a pessoa tem de escolher uma palavra-passe nova.
- **Desativar conta** (em Pessoas): a pessoa deixa de conseguir entrar, as sessões terminam e as tarefas por concluir ficam por atribuir. Ao reativar a conta, essas tarefas voltam a ser atribuídas à pessoa, exceto as que entretanto foram atribuídas a outra. O histórico mantém-se.
- **Dias de acesso** (só colaboradores): o administrador escolhe os dias da semana em que a pessoa pode entrar. Sem dias marcados, o acesso é diário. Usa o fuso horário `Europe/Lisbon` (ou a variável `TZ` do contentor).
- **Equipamentos** (administrador e gestor alteram; moradores consultam; colaboradores não veem): marca, garantia, técnico, documentos e revisões. Trinta dias antes de uma revisão é criada uma tarefa e o administrador e o gestor são avisados.
- **Finanças** (só administrador e gestor): despesas grandes da casa, despesas fixas lançadas automaticamente todos os meses, património (contas, depósitos, investimentos, cofre), orçamento anual e objetivos de poupança. Os itens do património marcados «só eu» são visíveis apenas para quem os criou.
- **Regras da casa** (Definições → A casa): «Moradores podem pedir para atribuir tarefas a colaboradores» (ligada por omissão) e «O trabalho dos colaboradores precisa de aprovação» (desligada por omissão). O administrador e o gestor aprovam em «Hoje» ou na ficha da tarefa.
- A tabela completa está em **Pessoas → O que cada perfil pode fazer**.

## Acesso

- A aplicação é aberta através do **Ingress** do Home Assistant (barra lateral ou app Companion). Não expõe nenhuma porta na rede.
- Fora de casa, funciona através do acesso remoto que já usa para o Home Assistant.
- A conta do Daily Casa é independente da conta do Home Assistant.

## Instalar no ecrã principal do telemóvel (sem o cabeçalho do Home Assistant)

Por omissão a app abre dentro do Home Assistant. Para a ter como app própria no iPhone ou no Android, na rede de casa:

1. Em **Definições → Aplicações → Daily Casa → Configuração**, na secção **Rede**, escreva `3000` no campo do acesso direto e guarde. A aplicação reinicia.
2. No telemóvel, ligado ao Wi-Fi de casa, abra no Safari (ou no Chrome) o endereço IP do Home Assistant com a porta, por exemplo `http://192.168.1.50:3000` (o IP está em Definições → Sistema → Rede). O nome `homeassistant.local` nem sempre funciona no iPhone.
   Convém reservar esse IP no router (reserva DHCP), para não mudar e a app instalada continuar a abrir.
3. Entre com o utilizador e a palavra-passe da Daily Casa.
4. iPhone: **Partilhar → Adicionar ao ecrã principal**. Android: **menu → Instalar aplicação**.

A app fica com ícone próprio e em ecrã inteiro. Só funciona na rede de casa; fora de casa continue a usar a app Home Assistant. Para desligar, apague o número no campo do acesso direto.

## Dados e cópias de segurança

- Todos os dados ficam em `/data/casa.json`, criado no primeiro arranque e mantido entre atualizações. As fotografias das tarefas ficam em `/data/photos` e os documentos dos equipamentos em `/data/docs` (incluídos nas cópias do Home Assistant, não nas cópias JSON da app).
- **Cópias automáticas da aplicação:** uma por dia e outra antes de cada atualização de versão, em `/data/backups` (ficam as últimas 14 diárias). Em **Definições → Dados e cópias**, o administrador pode criar, descarregar, carregar e restaurar cópias. Antes de restaurar, o estado atual é guardado.
- As cópias de segurança do Home Assistant incluem estes dados. A aplicação é parada durante a cópia (`backup: cold`) para garantir que o ficheiro fica consistente.
- Em **Definições**, o administrador pode exportar tarefas, compras, trabalhos e histórico para JSON (sem palavras-passe). **As finanças não são incluídas nesta exportação**; dependem da cópia de segurança do Home Assistant.
- A importação aceita até 500 tarefas por ficheiro e ignora duplicados (mesmo título, divisão e tipo).

## Atualizar

1. Crie uma cópia de segurança do Home Assistant (a aplicação também guarda uma cópia própria antes de mudar de versão).
2. Em **Definições → Aplicações**, verifique se há atualizações e selecione **Atualizar** no Daily Casa.
3. Abra a aplicação, confirme a versão em **Definições** e verifique que os dados continuam presentes.

## Home Assistant (opcional)

Em **Definições → Notificações e Home Assistant** (administrador):

- **Notificações** para a app Home Assistant de cada pessoa: tarefa atribuída e resumo diário à hora escolhida.
- **Sensores** `sensor.daily_casa_*`: tarefas por fazer, atrasadas, para hoje, compras por fazer, última conclusão, «hoje» (lista das tarefas de hoje e atrasadas) e estado da casa (%).
- **Cartão para o painel**: código pronto a colar num painel (por exemplo, num tablet na cozinha) com as tarefas de hoje, o estado da casa e as compras. As tarefas privadas e as finanças nunca são incluídas.
- **Automações:** o Home Assistant pode criar tarefas e produtos de compras através de `rest_command`, com um token próprio (a configuração pronta a copiar está nessa secção).

A aplicação pede acesso à API do Home Assistant (`homeassistant_api`) só para isto. Enquanto nada for configurado, não envia nada.

## Limitações

- Sem ligação, a app abre com os últimos dados guardados no dispositivo. Concluir tarefas e mexer nas compras fica em fila e é enviado quando a ligação voltar; as restantes alterações exigem ligação.
- A aplicação não faz pedidos a serviços externos (a letra está incluída).
- Pensada para uma casa (poucas pessoas em simultâneo). Os dados são gravados num único ficheiro JSON.

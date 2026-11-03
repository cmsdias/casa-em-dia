# Casa em Dia

Aplicação para organizar a casa em conjunto: tarefas pontuais, rotinas recorrentes, lista de compras, registo de trabalhos realizados e finanças domésticas.

## Primeiro acesso

1. Inicie a aplicação e abra **Abrir interface Web** (ou o item **Casa em Dia** na barra lateral).
2. Crie a conta de administrador. Use uma palavra-passe longa (mínimo 10 caracteres) e diferente da do Home Assistant.
3. Em **Pessoas**, crie as contas das restantes pessoas da casa e atribua o perfil adequado.
4. Opcional: em **Definições**, ajuste as divisões e categorias e importe uma lista de tarefas em JSON.

## Perfis

| Perfil | O que pode fazer |
| --- | --- |
| Administrador | Tudo: contas, perfis, definições, importação/exportação, todas as tarefas e todas as contas financeiras. |
| Gestor | Gerir tarefas partilhadas, atribuir tarefas, alterar divisões e categorias. Finanças próprias ou partilhadas consigo. |
| Morador | Ver tarefas partilhadas, gerir as suas e concluir as que lhe foram atribuídas. Finanças próprias ou partilhadas consigo. |
| Colaborador | Apenas tarefas que criou ou que lhe foram atribuídas. Sem acesso às finanças. |

As permissões são verificadas no servidor em cada pedido, não apenas escondidas na interface. Ao mudar o perfil ou a palavra-passe de alguém, as sessões dessa pessoa terminam.

- **Tarefas privadas** só são visíveis para quem as criou, incluindo para o administrador.
- **Contas novas e palavras-passe repostas** pelo administrador são temporárias: na primeira entrada, a pessoa tem de escolher uma palavra-passe nova.
- **Desativar conta** (em Pessoas): a pessoa deixa de conseguir entrar, as sessões terminam e as tarefas por concluir ficam por atribuir. Ao reativar a conta, essas tarefas voltam a ser atribuídas à pessoa, exceto as que entretanto foram atribuídas a outra. O histórico mantém-se.
- **Dias de acesso** (só colaboradores): o administrador escolhe os dias da semana em que a pessoa pode entrar. Sem dias marcados, o acesso é diário. Usa o fuso horário `Europe/Lisbon` (ou a variável `TZ` do contentor).
- A tabela completa está em **Pessoas → O que cada perfil pode fazer**.

## Acesso

- A aplicação é aberta através do **Ingress** do Home Assistant (barra lateral ou app Companion). Não expõe nenhuma porta na rede.
- Fora de casa, funciona através do acesso remoto que já usa para o Home Assistant.
- A conta do Casa em Dia é independente da conta do Home Assistant.

## Dados e cópias de segurança

- Todos os dados ficam em `/data/casa.json`, criado no primeiro arranque e mantido entre atualizações.
- As cópias de segurança do Home Assistant incluem estes dados. A aplicação é parada durante a cópia (`backup: cold`) para garantir que o ficheiro fica consistente.
- Em **Definições**, o administrador pode exportar tarefas, compras, trabalhos e histórico para JSON (sem palavras-passe). **As finanças não são incluídas nesta exportação**; dependem da cópia de segurança do Home Assistant.
- A importação aceita até 500 tarefas por ficheiro e ignora duplicados (mesmo título, divisão e tipo).

## Atualizar

1. Crie uma cópia de segurança do Home Assistant.
2. Em **Definições → Aplicações**, verifique se há atualizações e selecione **Atualizar** no Casa em Dia.
3. Abra a aplicação, confirme a versão em **Definições** e verifique que os dados continuam presentes.

## Limitações

- Sem notificações nem anexos/fotografias.
- Sem escrita offline: a interface abre a partir da cache, mas guardar alterações exige ligação ao Home Assistant.
- A aplicação não faz pedidos a serviços externos (a letra está incluída).
- Pensada para uma casa (poucas pessoas em simultâneo). Os dados são gravados num único ficheiro JSON.

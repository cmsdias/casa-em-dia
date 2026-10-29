# CASA EM DIA 1.0.0 — GUIA DE INSTALAÇÃO NO HOME ASSISTANT GREEN

Versão inicial: 28 de outubro de 2026

> **Começa aqui.** Este guia foi escrito para alguém sem conhecimentos de programação. Não precisas de instalar Docker nem de executar comandos.

## O que vais obter

- Uma aplicação Casa em Dia na barra lateral do Home Assistant.
- Uma conta tua e contas separadas para outras pessoas da casa.
- Tarefas e rotinas guardadas no Home Assistant Green, acessíveis aos utilizadores autorizados.
- Um repositório GitHub que servirá para instalar novas versões sem perder os dados.

## Ficheiros que recebes

**1. `Casa_em_Dia_1.0.0_Repositorio_Home_Assistant.zip`** — código pronto a publicar no GitHub; **não inclui dados pessoais**.

**2. `Casa_em_Dia_Tarefas_da_Casa.json`** — lista privada de tarefas para importar **depois** da instalação (42 pendências + 8 rotinas sugeridas). Não publicar no GitHub.

**3. `Casa_em_Dia_Tarefas_Pessoais_NAO_PARTILHAR.json`** — duas tarefas financeiras/administrativas, entregues à parte por prudência. Não importes enquanto a aplicação não permitir tarefas privadas: todos os moradores com conta conseguem ver as tarefas importadas.

## PASSO 1 — Descarregar e extrair o ZIP no computador Windows

1. Descarrega os três ficheiros.
2. No Explorador de Ficheiros, faz clique direito no ZIP → **Extrair tudo...**.
3. Abre a pasta extraída `Casa_em_Dia_1_0_0_Repositorio` e verifica que contém `repository.yaml`, `README.md`, `GUIA_PASSO_A_PASSO.md` e a subpasta `casa_em_dia`.
4. **Não copies os ficheiros JSON privados para esta pasta.** Guarda-os noutra localização, por exemplo `Documentos\Casa em Dia — privado`.

## PASSO 2 — Criar uma conta GitHub

1. Se ainda não tens conta, abre https://github.com/signup e cria uma.
2. Abre https://desktop.github.com/ e instala o **GitHub Desktop** no Windows.
3. Abre o GitHub Desktop e inicia sessão com a tua conta GitHub.

**Porque usar GitHub Desktop?** Permite publicar os ficheiros e futuras atualizações sem comandos técnicos.

## PASSO 3 — Criar o repositório local

1. No GitHub Desktop, escolhe **File → Add local repository...**.
2. Em **Choose...**, escolhe a pasta `Casa_em_Dia_1_0_0_Repositorio` que extraíste.
3. Se aparecer a mensagem de que esta pasta ainda não é um repositório Git, clica em **create a repository here**.
4. Confirma que a opção para ignorar ficheiros usa o `.gitignore` incluído e finaliza a criação.
5. Na coluna inferior esquerda, escreve a descrição do primeiro registo: `Casa em Dia 1.0.0`.
6. Clica em **Commit to main**.

## PASSO 4 — Publicar no GitHub

1. No GitHub Desktop, clica em **Publish repository** (Publicar repositório).
2. Escolhe um nome estável, por exemplo `casa-em-dia-ha`.
3. **Desmarca `Keep this code private`**: o repositório precisa de ser acessível pelo Home Assistant. O código público **não inclui tarefas privadas nem contas**.
4. Clica em **Publish repository**.
5. Abre no browser o repositório: `https://github.com/TEU_UTILIZADOR/casa-em-dia-ha` (substitui `TEU_UTILIZADOR` pelo teu nome de utilizador GitHub).
6. Confirma que existem `repository.yaml` na raiz e a pasta `casa_em_dia` com `config.yaml` dentro.

**Importante:** se optares por um repositório privado, não assumas que o Home Assistant consegue cloná-lo: o método simples documentado utiliza um repositório acessível sem credenciais.

## PASSO 5 — Criar uma cópia de segurança do Home Assistant

1. Em casa, abre `http://homeassistant.local:8123` (ou o endereço habitual do Home Assistant).
2. Entra com uma conta de administrador.
3. Abre **Definições → Sistema → Cópias de segurança** (Backups).
4. Cria uma cópia de segurança e, se possível, guarda também uma cópia fora do Green.

## PASSO 6 — Adicionar o repositório no Home Assistant

1. Abre **Definições → Aplicações** (pode aparecer como *Suplementos/Add-ons* em versões antigas).
2. Seleciona **Instalar aplicação** para abrir a loja.
3. No canto superior direito, abre o menu **⋮** e escolhe **Repositórios**.
4. Cola o endereço que copiaste do GitHub: `https://github.com/TEU_UTILIZADOR/casa-em-dia-ha`.
5. Clica **Adicionar** e fecha a janela.
6. Atualiza a página, se necessário. Deve aparecer o grupo **Casa em Dia — Aplicações** com a aplicação **Casa em Dia**.

Se não aparecer: verifica se o repositório é público, se `repository.yaml` está na raiz e se `casa_em_dia/config.yaml` existe. Em **Definições → Sistema → Registos → Supervisor** poderá estar o erro técnico.

## PASSO 7 — Instalar e iniciar

1. Abre a ficha **Casa em Dia** na loja.
2. Clica **Instalar**. É normal o Home Assistant precisar de descarregar e construir a imagem da aplicação no Green.
3. Ativa **Iniciar ao arrancar** e, se aparecer, **Watchdog**.
4. Clica **Iniciar**.
5. Abre o separador **Registos** e confirma que existe uma linha semelhante a `Casa em Dia online ... dados: /data/casa.json`.
6. Clica **Abrir interface Web**. Na primeira utilização, cria a tua conta de administrador com palavra-passe longa e única.
7. Se disponível, ativa **Mostrar na barra lateral** para acederes diretamente ao Casa em Dia.

## PASSO 8 — Importar as tarefas (sem publicar informações pessoais)

1. No computador, abre a aplicação pela interface Web do Home Assistant e entra com a tua conta.
2. Na barra de navegação da aplicação, abre **Definições**.
3. Seleciona **Importar ficheiro JSON**.
4. Escolhe `Casa_em_Dia_Tarefas_da_Casa.json` (o ficheiro separado do ZIP).
5. Confirma a importação.
6. A aplicação indica quantas tarefas foram importadas; a importação pode ser repetida, ignorando duplicados.
7. Em **Tarefas** e **Rotinas**, verifica que os itens aparecem e atribui responsáveis conforme necessário.

**Não importes o ficheiro `Tarefas_Pessoais_NAO_PARTILHAR.json`** para o espaço comum enquanto não criarmos a funcionalidade de tarefas privadas.

## PASSO 9 — Criar contas para outras pessoas

1. Na aplicação, abre **Pessoas**.
2. Clica **Adicionar pessoa**.
3. Indica nome, nome de utilizador e palavra-passe inicial (mínimo 10 caracteres).
4. Cada pessoa deverá entrar com a sua conta própria.
5. As mudanças feitas por uma pessoa ficam guardadas no Green e aparecem às restantes quando recarregam a aplicação ou regressam ao ecrã.

## PASSO 10 — Abrir no telemóvel

**Na rede doméstica:** podes usar o Home Assistant Companion App e abrir o **Casa em Dia** pela barra lateral. Também podes abrir num browser `http://IP_DO_GREEN:3037/`, substituindo o IP pelo endereço do Green. Este último é um acesso HTTP local para teste, não um endereço HTTPS remoto.

**Fora de casa:** se já utilizas acesso remoto ao Home Assistant, a app pode ser aberta dentro do painel do Home Assistant através do Ingress. Isso **não** disponibiliza automaticamente a porta `3037` nem uma PWA autónoma fora de casa.

**Adicionar como PWA independente ao ecrã principal:** para experiência completa, é necessário um endereço HTTPS próprio, a preparar numa etapa posterior. Não abras a porta `3037` no router para a Internet.

## COMO FAZER ATUALIZAÇÕES FUTURAS

A aplicação instalada em 1.0.0 pode receber melhorias através do mesmo repositório, sem apagar os dados que estão em `/data`.

**Da nossa parte:** eu entrego um conjunto de ficheiros alterados e um pequeno resumo do que mudou.

**Da tua parte, no Windows:**
1. Faz uma cópia de segurança no Home Assistant e, na aplicação, exporta o JSON se possível.
2. Abre o GitHub Desktop e seleciona o repositório `casa-em-dia-ha`.
3. Copia os novos ficheiros fornecidos por mim para a pasta local desse repositório, substituindo os antigos **sem mudar o nome do repositório nem a pasta `casa_em_dia`**.
4. Confirma que `casa_em_dia/config.yaml` tem uma nova versão (`1.0.1`, `1.1.0`, ...).
5. Na janela do GitHub Desktop, escreve a descrição da atualização e clica **Commit to main**.
6. Clica **Push origin** para enviar ao GitHub.
7. No Home Assistant, abre **Definições → Aplicações → Loja → ⋮ → Verificar atualizações/Recarregar** (o nome pode variar).
8. Abre **Casa em Dia** e seleciona **Atualizar** se estiver disponível. Aceita a opção de criar uma cópia de segurança, se apresentada.
9. Reabre a aplicação, verifica o número da versão e confirma que as tarefas anteriores continuam lá.

## RESOLUÇÃO DE PROBLEMAS RÁPIDA

- **Não aparece na loja:** repete Passo 6 e consulta os registos do Supervisor; o GitHub tem de ter o `repository.yaml` na raiz.
- **Não arranca:** abre **Casa em Dia → Registos** e guarda a mensagem de erro. Não elimines a aplicação para tentar resolver sem primeiro guardar uma cópia dos dados.
- **Diz que não há ligação:** confirma que a app está iniciada e que o Green está ligado à rede.
- **Fonte diferente:** a fonte Instrument Sans é carregada do Google Fonts, por isso requer acesso à Internet no browser.
- **Abrir pelo Ingress é diferente de instalar uma PWA:** no telemóvel, a navegação pela app do Home Assistant é suficiente para começar; vamos tratar da PWA independente em HTTPS depois.

## SEGURANÇA E LIMITAÇÕES IMPORTANTES

- **Todos os moradores que entrem no Casa em Dia veem todas as tarefas importadas**. A primeira versão não tem privacidade por tarefa.
- **Não publiques dados pessoais no GitHub:** nunca juntes os ficheiros de importação à pasta do repositório.
- Utiliza palavras-passe fortes e distintas. O login do Casa em Dia é separado do login do Home Assistant.
- Não abras portas 3037/3000 no router para a Internet.
- Em atualizações, cria sempre uma cópia de segurança antes.
- Esta versão é a base instalável 1.0.0, com as funcionalidades existentes da interface 2.2. O novo planeamento semanal/subtarefas/«Tenho 15 minutos» será implementado como atualização 1.1.0, não faz parte desta entrega.

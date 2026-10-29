# Casa em Dia — Versão 1.0.0

Aplicação de gestão de tarefas e rotinas para a casa. Instalação no Home Assistant Green (Home Assistant OS).

## Primeiro acesso

1. Instala e inicia a aplicação.
2. Seleciona **Abrir interface Web**. A aplicação solicita a criação da conta de administrador.
3. Em **Definições > Importar tarefas da casa**, seleciona o JSON privado fornecido separadamente. **Nunca publiques este ficheiro no GitHub.**
4. Em **Pessoas**, cria as contas dos restantes moradores.

## Acesso

- Dentro do Home Assistant, pela barra lateral, a aplicação utiliza o Ingress.
- Na rede doméstica, também pode ser aberta em `http://IP_DO_GREEN:3037/`.
- A porta 3037 não deve ser publicada na Internet; acesso remoto apenas através de uma solução HTTPS segura ou pelo acesso remoto do Home Assistant usando o painel.
- A PWA independente exige HTTPS para instalação completa no telemóvel. O painel via Ingress não é equivalente a uma PWA independente.

## Dados e backups

A base de dados (`/data/casa.json`) é criada no primeiro arranque e mantém-se durante atualizações. O Home Assistant inclui os dados persistentes da aplicação em cópias de segurança compatíveis. Em **Definições**, o administrador pode exportar as tarefas para um ficheiro JSON (sem as palavras-passe).

## Atualizar

Após publicar uma nova versão no GitHub com o `version` de `config.yaml` alterado, atualiza a lista de aplicações e seleciona **Atualizar** na ficha do Casa em Dia. Cria uma cópia de segurança antes de atualizar.

## Limitações v1.0.0

Os utilizadores autenticados podem ver as mesmas tarefas. Não há tarefas privadas, notificações, fotos, planeamento semanal ou subtarefas nesta primeira versão. Cada pessoa utiliza uma conta própria. Se não houver acesso à rede, não é possível guardar alterações. Esta aplicação é independente da autenticação do Home Assistant e não deve ficar exposta publicamente através da porta 3037.

# Separação entre desenvolvimento privado e distribuição Home Assistant

Estado: **planeada, ainda não aplicada**. O repositório `cmsdias/casa-em-dia` continua público até existir um repositório de distribuição independente e testado.

## Arquitetura proposta

- **Privado**: `cmsdias/casa-em-dia` mantém código-fonte, testes, branches e documentação de desenvolvimento. Após a migração, desativar a publicação pública de demonstrações e verificar GitHub Pages, que pode permanecer público apesar do repositório privado.
- **Público e mínimo**: criar `cmsdias/casa-em-dia-ha` apenas com `repository.yaml` e o diretório instalável `casa_em_dia/` da versão publicada. O diretório é necessário porque o Supervisor do Home Assistant constrói o add-on localmente a partir do código ou da imagem definida. O repositório público não pode ocultar os ficheiros que o Supervisor necessita de descarregar.
- **Privado, sem código-fonte público (alternativa)**: publicar uma imagem Docker do add-on num registry acessível anonimamente, com `config.yaml` que indique `image` e `version`, e um repositório público mínimo de metadados. Isto exige pipeline de build multi-arquitetura, publicação do contentor, manifest e verificação de instalação. A imagem continua distribuída publicamente, mas o código-fonte deixa de ser necessário no repositório de distribuição.

## Plano antes de tornar o original privado

1. Criar novo repositório público `casa-em-dia-ha` através da conta GitHub do proprietário.
2. Preparar a publicação automatizada de versões e os metadados do add-on para esse repositório (sem credenciais/dados pessoais).
3. Testar a instalação no Home Assistant e confirmar a preservação de `/data`. Como o slug pode ser o mesmo, verificar se o Supervisor aceita atualizar a origem em vez de criar um segundo add-on.
4. Só depois tornar privado `casa-em-dia`, desativar Pages público e verificar que as credenciais do conector mantêm acesso a repositórios privados.
5. Não alterar o add-on instalado sem cópia de segurança verificada.

A autorização do conector GitHub **não** equivale à autorização do Supervisor Home Assistant; são autenticações independentes.

## Limitação da execução nesta sessão

A ligação GitHub aqui disponível permite commits, branches e pull requests, mas não fornece `create_repository` nem `update_repository_visibility`. Por isso a mudança de visibilidade e a criação do repositório de distribuição não podem ser realizadas por essa ligação sem configurar outro acesso. Nunca mudar primeiro para privado, para evitar interromper atualizações.

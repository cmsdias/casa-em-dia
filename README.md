# Casa em Dia

Aplicação doméstica partilhada para tarefas pontuais, rotinas, compras, trabalhos realizados e finanças da casa, com contas próprias e quatro perfis de acesso. Corre como add-on (aplicação) do **Home Assistant**, testada no Home Assistant Green.

> Os dados reais (tarefas, contas, palavras-passe, finanças) ficam apenas no Home Assistant, em `/data/casa.json`. **Nunca** fazem parte deste repositório.

## Estado

| | |
| --- | --- |
| Versão em desenvolvimento | ver `casa_em_dia/config.yaml` e [`CHANGELOG`](casa_em_dia/CHANGELOG.md) |
| Demonstração (dados fictícios) | https://cmsdias.github.io/casa-em-dia/ · próxima versão em [`/next/`](https://cmsdias.github.io/casa-em-dia/next/) |

## Estrutura

```text
repository.yaml            Metadados do repositório de add-ons do Home Assistant
casa_em_dia/               Add-on instalável (o que o Supervisor descarrega e constrói)
  config.yaml              Versão, ingress, arquiteturas
  Dockerfile               Imagem node:22-alpine, processo não-root
  server.js                Servidor HTTP + API (sem dependências externas)
  public/                  Interface (HTML, CSS e JavaScript sem frameworks)
  test-*.js                Testes de integração e de interface
  DOCS.md / README.md      Documentação apresentada no Home Assistant
  CHANGELOG.md             Histórico de versões
docs/index.html            Entrada da demonstração no GitHub Pages
documentacao/              Arquitetura, instalação, testes e planos
.github/workflows/         CI (testes) e publicação da demonstração
```

## Desenvolvimento

Requer Node.js 22. Não há dependências de produção.

```bash
cd casa_em_dia
npm run check            # sintaxe
npm test                 # servidor, perfis e finanças
npm install --no-save playwright && npx playwright install chromium
npm run test:ui          # interface em 390 px e 1440 px

# Servidor local com dados de teste (nunca apontar para dados reais)
PORT=3000 HOST=127.0.0.1 DATA_DIR=./data npm start
```

### Fluxo de trabalho

1. Cada alteração é feita numa branch e submetida por pull request para `main`.
2. Os testes correm automaticamente no PR. Se passarem, a demonstração `/next/` é atualizada com essa branch.
3. Validar a demonstração no iPhone e no desktop.
4. Antes de integrar: subir a versão em `config.yaml` e `package.json` (e os `?v=` em `public/index.html`), e acrescentar a entrada no `CHANGELOG.md`.
5. Integrar em `main`, fazer cópia de segurança no Home Assistant e só depois atualizar o add-on.

## Documentação

- [Arquitetura e API](documentacao/ARQUITETURA.md)
- [Instalação e atualização no Home Assistant](documentacao/INSTALACAO.md)
- [Guia de testes antes de cada atualização](documentacao/GUIA_TESTES.md)
- [Separação entre desenvolvimento privado e distribuição](documentacao/DISTRIBUICAO_PRIVADA.md)
- [Especificação do módulo de finanças](documentacao/FINANCAS.md)

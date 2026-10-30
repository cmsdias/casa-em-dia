# Instalação e atualização no Home Assistant

O Home Assistant instala o Casa em Dia a partir do repositório público `https://github.com/cmsdias/casa-em-dia`. O Supervisor descarrega a pasta `casa_em_dia/` e constrói a imagem localmente no Green. Os dados ficam em `/data/casa.json`, dentro do Home Assistant, e nunca no GitHub.

> Quando a [distribuição separada](DISTRIBUICAO_PRIVADA.md) estiver pronta, o endereço do repositório muda. Este guia será atualizado nessa altura.

## Primeira instalação

1. **Cópia de segurança:** em *Definições → Sistema → Cópias de segurança*, crie uma cópia antes de começar.
2. **Adicionar o repositório:** em *Definições → Aplicações → Loja de aplicações → ⋮ → Repositórios*, adicione `https://github.com/cmsdias/casa-em-dia`.
3. **Instalar:** na loja aparece o grupo *Casa em Dia — Aplicações*. Abra *Casa em Dia* e selecione **Instalar**. A construção da imagem pode demorar alguns minutos no Green.
4. **Iniciar:** ative *Iniciar no arranque*, *Watchdog* e *Mostrar na barra lateral*, e clique em **Iniciar**.
5. **Verificar:** no separador *Registos* deve surgir `Casa em Dia online … dados: /data/casa.json`.
6. **Configurar:** abra a interface e siga o *Primeiro acesso* descrito no separador **Documentação** do add-on.

## Importar a lista privada de tarefas

O ficheiro JSON com as tarefas reais da casa é guardado **fora** do repositório (ver `.gitignore`).

1. Entre como administrador e abra **Definições → Importar ficheiro JSON**.
2. Selecione o ficheiro. A aplicação indica quantas tarefas foram importadas e quantas foram ignoradas (duplicadas ou inválidas).
3. Pode repetir a importação sem criar duplicados.

Formato mínimo de cada tarefa:

```json
{ "tasks": [ { "title": "Exemplo: limpar filtros do exaustor", "room": "Cozinha", "kind": "project", "priority": "P3" } ] }
```

Campos aceites: `title`, `room`, `notes`, `kind` (`project` | `routine`), `priority` (`P1`–`P4`), `status`, `repeat` (`none` | `daily` | `weekly` | `biweekly` | `monthly`), `dueDate` (`AAAA-MM-DD`), `estimatedMinutes`, `category`, `thisWeek`, `subtasks`, `visibility` (`shared` | `private`), `suggested`.

## Atualizar para uma nova versão

1. Confirme que a versão foi integrada em `main` e que os testes do GitHub passaram.
2. Faça uma cópia de segurança do Home Assistant (e, por precaução, uma exportação JSON nas Definições da aplicação).
3. Em *Definições → Aplicações*, use **Verificar atualizações**. Abra *Casa em Dia* e selecione **Atualizar**.
4. Depois de atualizar, siga o [guia de testes](GUIA_TESTES.md) no iPhone e no desktop.

### Voltar atrás

Se algo correr mal, restaure a cópia de segurança feita no passo 2. Em *Cópias de segurança*, escolha a cópia e restaure apenas a aplicação *Casa em Dia* (inclui os dados).

## Resolução de problemas

- **Não aparece na loja:** confirme o endereço do repositório e consulte *Definições → Sistema → Registos → Supervisor*.
- **Não arranca:** consulte os *Registos* do add-on. Se surgir `não foi possível ler /data/casa.json`, o ficheiro de dados está danificado. A aplicação não o altera; restaure uma cópia de segurança.
- **"Demasiadas tentativas":** após 8 tentativas de login falhadas para o mesmo utilizador, é preciso esperar 10 minutos.

## Segurança

- Não exponha a porta interna (3000) na rede nem no router. O acesso é feito apenas pelo Ingress do Home Assistant.
- Use palavras-passe próprias para o Casa em Dia, diferentes das do Home Assistant.
- Nunca coloque ficheiros de importação, exportações ou cópias de segurança no repositório.

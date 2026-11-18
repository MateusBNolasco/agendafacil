# AgendaFácil

Aplicação web de **agendamento de serviços** para o Studio Aurora, um estúdio de beleza fictício. Desenvolvida como prova prática final da disciplina de JavaScript (Prof. Cleidson Daniel, Faculdade Anhanguera).

## Problema

O estúdio anotava os horários em papel e no WhatsApp, o que causava horários duplicados para o mesmo profissional, marcações em domingos e feriados e nenhuma visão do faturamento. O AgendaFácil centraliza os agendamentos e só oferece horários que realmente estão livres.

## Integrantes

| Nome | GitHub |
|---|---|
| Mateus Bonifácio Nolasco | [@MateusBNolasco](https://github.com/MateusBNolasco) |
| Kayky Moreira Assunção | [@Kayky04Moreira](https://github.com/Kayky04Moreira) |

## Funcionalidades

- Cadastro, listagem, edição e exclusão de agendamentos (com confirmação)
- Conclusão e cancelamento de atendimentos
- Lista de profissionais filtrada pelo serviço escolhido
- Horários livres calculados a partir do expediente, da duração do serviço e da agenda do profissional
- Bloqueio de datas passadas, domingos e feriados nacionais (BrasilAPI)
- Pesquisa pelo nome do cliente, filtros por situação, profissional e data, e ordenação
- Indicadores: atendimentos do dia, próximos agendamentos, faturamento previsto, faturamento realizado, cancelados e serviço mais procurado
- Mensagens de sucesso, erro e lista vazia; máscara de telefone
- Modo diurno e noturno, com a preferência visual salva no navegador
- Layout responsivo (computador e celular)

## Regras de negócio

| Regra | Onde |
|---|---|
| Funcionamento: segunda a sexta 08:00–18:00, sábado 08:00–12:00, domingo fechado | `FUNCIONAMENTO` em `regras.js` |
| Não agenda em data passada, domingo ou feriado nacional | `verificarDia` |
| Um profissional não pode ter dois atendimentos no mesmo período (considera a duração do serviço) | `gerarHorariosLivres` |
| O atendimento precisa terminar antes do fechamento | `gerarHorariosLivres` |
| O profissional precisa realizar o serviço escolhido | `validarAgendamento` |
| Nome com pelo menos 3 letras e telefone com DDD | `validarAgendamento` |
| Só é possível concluir um atendimento depois do horário marcado | `podeConcluir` |
| Agendamentos concluídos ou cancelados não podem ser editados | `iniciarEdicao` em `main.js` |

## Tecnologias

- HTML5 e CSS3 (Grid, Flexbox, media queries)
- JavaScript (ES6+) com módulos `import`/`export`, sem frameworks
- [json-server](https://github.com/typicode/json-server) como API REST local (`db.json`)
- [BrasilAPI](https://brasilapi.com.br/docs#tag/Feriados-Nacionais) para os feriados nacionais
- `localStorage` para guardar os feriados já consultados e a preferência de tema

## APIs utilizadas

| Requisição | Uso |
|---|---|
| `GET /servicos`, `GET /profissionais`, `GET /agendamentos` | Carregar os dados ao abrir a página |
| `POST /agendamentos` | Criar agendamento |
| `PUT /agendamentos/:id` | Editar agendamento |
| `PATCH /agendamentos/:id` | Concluir ou cancelar |
| `DELETE /agendamentos/:id` | Excluir |
| `GET https://brasilapi.com.br/api/feriados/v1/{ano}` | Feriados nacionais do ano atual e do próximo |

Todas as respostas são verificadas (`response.ok`). Se a API local estiver desligada ou o registro não existir mais (404), a aplicação mostra a mensagem de erro e recarrega a lista. Se a BrasilAPI estiver fora do ar, o sistema avisa e continua funcionando sem o bloqueio de feriados.

## Como executar

Pré-requisito: [Node.js](https://nodejs.org) instalado.

```bash
git clone https://github.com/MateusBNolasco/agendafacil.git
cd agendafacil
npm install
npm start
```

Depois, acesse **http://localhost:3400** no navegador. O mesmo comando sobe a API e a página.

> Os dados ficam salvos no arquivo `db.json`. Para voltar aos dados de exemplo, use `git checkout db.json`.

## Estrutura

```
agendafacil/
├── db.json              banco de dados da API (serviços, profissionais e agendamentos)
├── package.json         dependência e script do json-server
└── public/
    ├── index.html       estrutura da página
    ├── css/style.css    identidade visual e responsividade
    └── js/
        ├── main.js        estado da aplicação, eventos e fluxo da tela
        ├── api.js         requisições à API (fetch, async/await, tratamento de erros)
        ├── feriados.js    consulta à BrasilAPI com cache no localStorage
        ├── regras.js      regras de negócio, validações, indicadores, filtros e ordenação
        ├── ui.js          renderização da lista, indicadores e mensagens no DOM
        └── formatacao.js  formatação de moeda, data e telefone
```

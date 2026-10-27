# Formulários — Aula 1

App para **criar formulários, respondê-los e ver as respostas**, feito com **Angular 22** no front e uma API **Node + Express** que guarda os dados em **JSON**.

- **Painel** com a lista de formulários na lateral e abas *Visão geral*, *Editar* e *Respostas*.
- **Responder** no estilo conversa: uma pergunta por vez, com navegação por teclado (Enter avança, A–Z escolhe opções).
- 4 tipos de pergunta: resposta curta, parágrafo, múltipla escolha e caixas de seleção, com perguntas obrigatórias.
- Resumo das respostas com percentuais e tabela completa.
- Tema claro/escuro automático (segue o sistema).

## Como rodar

Pré-requisito: **Node.js 24** ou mais novo.

```bash
npm install
npm start
```

Abra **http://localhost:4200**.

O `npm start` sobe juntos:

| Processo | Endereço | O que é |
|---|---|---|
| `api` | http://localhost:3000/api | API Node/Express (pasta `server/`) |
| `web` | http://localhost:4200 | Angular (`ng serve`) |

O navegador só fala com a porta 4200: o `ng serve` repassa tudo que começa com `/api` para a API ([proxy.conf.json](proxy.conf.json)).
Os dados ficam em `server/db.json`, criado na primeira execução com um formulário de exemplo.

## Testes

```bash
npm test          # front-end (Vitest)
npm run test:api  # API (node:test, sobe o servidor com um db.json temporário)
```

## Organização das pastas

```
src/
├─ index.html, main.ts, styles.css   página base, inicialização e estilos globais (tema)
└─ app/
   ├─ html/   templates de cada tela
   ├─ css/    estilos de cada tela
   └─ ts/     componentes, rotas, serviços, modelo e testes (*.spec.ts)
server/
├─ server.ts      ponto de entrada da API (porta 3000)
├─ app.ts         rotas REST
├─ banco.ts       leitura/gravação do db.json
├─ validacao.ts   validação do corpo das requisições
└─ api.test.ts    testes de integração da API
```

Cada tela tem o mesmo nome nas três pastas — por exemplo, o editor é `ts/editor.ts` + `html/editor.html` + `css/editor.css`:

| Tela | Arquivo base |
|---|---|
| Moldura do painel (lateral) | `painel` |
| Início do painel | `inicio` |
| Cabeçalho e abas do formulário | `detalhe` |
| Aba Visão geral | `visao` |
| Aba Editar / Novo formulário | `editor` |
| Aba Respostas | `respostas` |
| Responder (uma pergunta por vez) | `responder` |
| Questionário de contato | `questionario` |

Fora das telas, em `ts/`: `formulario.model.ts` (tipos e regras, usado também pela API), `formularios.api.ts` (chamadas HTTP) e `formularios.service.ts` (estado em signals).

## API

| Método | Rota | Resposta |
|---|---|---|
| GET | `/api/formularios` | 200 lista de formulários |
| GET | `/api/formularios/:id` | 200 formulário · 404 |
| PUT | `/api/formularios/:id` | 201 criado · 200 atualizado · 422 inválido |
| DELETE | `/api/formularios/:id` | 204 (apaga também as respostas) · 404 |
| GET | `/api/formularios/:id/respostas` | 200 respostas do formulário · 404 |
| POST | `/api/formularios/:id/respostas` | 201 resposta · 404 · 422 inválida |
| GET | `/api/respostas` | 200 todas as respostas |

Erros sempre no formato `{ "error": { "code": "...", "message": "...", "details": ... } }`.
O servidor valida tudo de novo com as mesmas regras do front (`formulario.model.ts`) — o Node 24 executa os arquivos `.ts` diretamente.

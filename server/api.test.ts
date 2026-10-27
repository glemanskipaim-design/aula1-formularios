// Testes de integração da API: sobe o app numa porta livre com um db.json temporário.
// Rodar com: npm run test:api
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, beforeEach, describe, it } from 'node:test';
import type { Server } from 'node:http';
import { criarApp } from './app.ts';
import { Banco } from './banco.ts';

let pasta: string;
let arquivo: string;
let servidor: Server;
let base: string;

async function chamar(metodo: string, caminho: string, corpo?: unknown) {
  const resposta = await fetch(`${base}${caminho}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: typeof corpo === 'string' ? corpo : corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await resposta.text();
  return { status: resposta.status, corpo: texto ? JSON.parse(texto) : null };
}

const formularioValido = {
  titulo: 'Lanche',
  descricao: '',
  perguntas: [
    { id: 'p1', titulo: 'Sabor?', tipo: 'multipla', obrigatoria: true, opcoes: ['Doce', 'Salgado'] },
  ],
};

describe('API de formulários', () => {
  before(() => {
    pasta = mkdtempSync(join(tmpdir(), 'aula1-api-'));
  });

  beforeEach(async () => {
    servidor?.close();
    arquivo = join(pasta, `db-${crypto.randomUUID()}.json`);
    servidor = criarApp(new Banco(arquivo)).listen(0, '127.0.0.1');
    await new Promise((pronto) => servidor.once('listening', pronto));
    base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  });

  after(() => {
    servidor?.close();
    rmSync(pasta, { recursive: true, force: true });
  });

  it('começa com o formulário de exemplo', async () => {
    const { status, corpo } = await chamar('GET', '/api/formularios');
    assert.equal(status, 200);
    assert.deepEqual(corpo.map((f: { id: string }) => f.id), ['exemplo']);
  });

  it('PUT cria (201), substitui (200) e grava no arquivo', async () => {
    const criado = await chamar('PUT', '/api/formularios/f1', formularioValido);
    assert.equal(criado.status, 201);
    assert.equal(criado.corpo.id, 'f1');

    const trocado = await chamar('PUT', '/api/formularios/f1', { ...formularioValido, titulo: '  Novo nome ' });
    assert.equal(trocado.status, 200);
    assert.equal(trocado.corpo.titulo, 'Novo nome');
    assert.equal(trocado.corpo.criadoEm, criado.corpo.criadoEm);

    const salvo = JSON.parse(readFileSync(arquivo, 'utf8'));
    assert.equal(salvo.formularios.find((f: { id: string }) => f.id === 'f1').titulo, 'Novo nome');
  });

  it('PUT recusa formulário fora das regras com 422 e a lista de problemas', async () => {
    const { status, corpo } = await chamar('PUT', '/api/formularios/f1', {
      ...formularioValido,
      perguntas: [{ ...formularioValido.perguntas[0], opcoes: ['A', 'A'] }],
    });
    assert.equal(status, 422);
    assert.equal(corpo.error.code, 'VALIDATION_FAILED');
    assert.deepEqual(corpo.error.details, ['A pergunta 1 tem opções repetidas.']);
  });

  it('PUT recusa tipos errados e JSON malformado', async () => {
    const tipoErrado = await chamar('PUT', '/api/formularios/f1', { titulo: 1, perguntas: 'x' });
    assert.equal(tipoErrado.status, 422);

    const malformado = await chamar('PUT', '/api/formularios/f1', '{ quebrado');
    assert.equal(malformado.status, 400);
    assert.equal(malformado.corpo.error.code, 'INVALID_BODY');

    const idRuim = await chamar('PUT', '/api/formularios/a%20b', formularioValido);
    assert.equal(idRuim.status, 400);
  });

  it('POST de resposta valida obrigatórias e opções, e guarda só o que é válido', async () => {
    const faltando = await chamar('POST', '/api/formularios/exemplo/respostas', { valores: {} });
    assert.equal(faltando.status, 422);
    assert.deepEqual(faltando.corpo.error.details, [
      'A pergunta 1 é obrigatória.',
      'A pergunta 2 é obrigatória.',
    ]);

    const opcaoInventada = await chamar('POST', '/api/formularios/exemplo/respostas', {
      valores: { 'exemplo-nome': 'Ana', 'exemplo-nota': 'Péssima' },
    });
    assert.equal(opcaoInventada.status, 422);

    const ok = await chamar('POST', '/api/formularios/exemplo/respostas', {
      valores: { 'exemplo-nome': ' Ana ', 'exemplo-nota': 'Boa', 'nao-existe': 'x' },
    });
    assert.equal(ok.status, 201);
    assert.deepEqual(ok.corpo.valores, { 'exemplo-nome': 'Ana', 'exemplo-nota': 'Boa' });

    const lista = await chamar('GET', '/api/formularios/exemplo/respostas');
    assert.equal(lista.corpo.length, 1);
  });

  it('DELETE apaga o formulário e as respostas dele', async () => {
    await chamar('POST', '/api/formularios/exemplo/respostas', {
      valores: { 'exemplo-nome': 'Ana', 'exemplo-nota': 'Boa' },
    });
    assert.equal((await chamar('DELETE', '/api/formularios/exemplo')).status, 204);
    assert.equal((await chamar('GET', '/api/formularios/exemplo')).status, 404);
    assert.deepEqual((await chamar('GET', '/api/respostas')).corpo, []);
    assert.equal((await chamar('DELETE', '/api/formularios/exemplo')).status, 404);
  });

  it('responde 404 no formato padrão para rota desconhecida', async () => {
    const { status, corpo } = await chamar('GET', '/api/nada');
    assert.equal(status, 404);
    assert.deepEqual(corpo, { error: { code: 'ROUTE_NOT_FOUND', message: 'Rota não encontrada.', details: null } });
  });
});

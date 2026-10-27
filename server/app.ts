import express, { type ErrorRequestHandler, type Response } from 'express';
import { validarResposta, type Resposta } from '../src/app/ts/formulario.model.ts';
import type { Banco } from './banco.ts';
import { idValido, interpretarFormulario } from './validacao.ts';

/** Catálogo único de códigos de erro da API (o front decide pelo `code`, nunca pela mensagem). */
const CODIGOS = {
  FORM_NOT_FOUND: 404,
  ROUTE_NOT_FOUND: 404,
  INVALID_BODY: 400,
  VALIDATION_FAILED: 422,
  INTERNAL_ERROR: 500,
} as const;

type CodigoErro = keyof typeof CODIGOS;

function erro(res: Response, code: CodigoErro, message: string, details: unknown = null): void {
  res.status(CODIGOS[code]).json({ error: { code, message, details } });
}

/**
 * API REST dos formulários. Todas as rotas ficam sob /api.
 *
 *   GET    /api/formularios                    200 Formulario[]
 *   GET    /api/formularios/:id                200 Formulario | 404 FORM_NOT_FOUND
 *   PUT    /api/formularios/:id                201 criado | 200 substituído | 400 | 422 VALIDATION_FAILED
 *   DELETE /api/formularios/:id                204 (apaga também as respostas) | 404
 *   GET    /api/formularios/:id/respostas      200 Resposta[] | 404
 *   POST   /api/formularios/:id/respostas      201 Resposta | 404 | 422 VALIDATION_FAILED
 *   GET    /api/respostas                      200 Resposta[] (todas, para o painel)
 *
 * Erros sempre no formato { error: { code, message, details } }.
 * PUT usa id gerado pelo cliente: repetir a mesma chamada não duplica nada.
 */
export function criarApp(banco: Banco): express.Express {
  const app = express();
  const { dados } = banco;
  app.use(express.json({ limit: '200kb' }));

  const buscar = (id: string) => dados.formularios.find((f) => f.id === id);

  app.get('/api/formularios', (_req, res) => {
    res.json(dados.formularios);
  });

  app.get('/api/formularios/:id', (req, res) => {
    const formulario = buscar(req.params.id);
    if (!formulario) return erro(res, 'FORM_NOT_FOUND', 'Formulário não encontrado.');
    res.json(formulario);
  });

  app.put('/api/formularios/:id', (req, res) => {
    const { id } = req.params;
    if (!idValido(id)) return erro(res, 'INVALID_BODY', 'Id de formulário inválido.');
    const existente = buscar(id);
    const resultado = interpretarFormulario(req.body, id, existente?.criadoEm ?? new Date().toISOString());
    if (!resultado.ok) {
      return erro(res, 'VALIDATION_FAILED', 'O formulário tem problemas.', resultado.erros);
    }
    if (existente) {
      dados.formularios = dados.formularios.map((f) => (f.id === id ? resultado.valor : f));
    } else {
      dados.formularios.push(resultado.valor);
    }
    banco.salvar();
    res.status(existente ? 200 : 201).json(resultado.valor);
  });

  app.delete('/api/formularios/:id', (req, res) => {
    const { id } = req.params;
    if (!buscar(id)) return erro(res, 'FORM_NOT_FOUND', 'Formulário não encontrado.');
    dados.formularios = dados.formularios.filter((f) => f.id !== id);
    dados.respostas = dados.respostas.filter((r) => r.formularioId !== id);
    banco.salvar();
    res.status(204).end();
  });

  app.get('/api/formularios/:id/respostas', (req, res) => {
    const { id } = req.params;
    if (!buscar(id)) return erro(res, 'FORM_NOT_FOUND', 'Formulário não encontrado.');
    res.json(dados.respostas.filter((r) => r.formularioId === id));
  });

  app.post('/api/formularios/:id/respostas', (req, res) => {
    const formulario = buscar(req.params.id);
    if (!formulario) return erro(res, 'FORM_NOT_FOUND', 'Formulário não encontrado.');
    const { erros, valores } = validarResposta(formulario, req.body?.valores);
    if (erros.length > 0) {
      return erro(res, 'VALIDATION_FAILED', 'A resposta tem problemas.', erros);
    }
    const resposta: Resposta = {
      id: crypto.randomUUID(),
      formularioId: formulario.id,
      enviadaEm: new Date().toISOString(),
      valores,
    };
    dados.respostas.push(resposta);
    banco.salvar();
    res.status(201).json(resposta);
  });

  app.get('/api/respostas', (_req, res) => {
    res.json(dados.respostas);
  });

  app.use('/api', (_req, res) => erro(res, 'ROUTE_NOT_FOUND', 'Rota não encontrada.'));

  const tratarErro: ErrorRequestHandler = (falha, _req, res, _next) => {
    // JSON malformado ou corpo grande demais chegam aqui pelo express.json().
    if (falha?.type === 'entity.parse.failed' || falha?.type === 'entity.too.large') {
      return erro(res, 'INVALID_BODY', 'Corpo da requisição inválido.');
    }
    console.error(falha);
    erro(res, 'INTERNAL_ERROR', 'Erro inesperado no servidor.');
  };
  app.use(tratarErro);

  return app;
}

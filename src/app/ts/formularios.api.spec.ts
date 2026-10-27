import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { formularioDeExemplo } from './formulario.model';
import { FormulariosApi, mensagemDeErro } from './formularios.api';

describe('FormulariosApi', () => {
  let api: FormulariosApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(FormulariosApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('salva com PUT no id do formulário, mandando só os campos editáveis', async () => {
    const formulario = formularioDeExemplo();
    const salvo = api.salvarFormulario(formulario);

    const req = http.expectOne('/api/formularios/exemplo');
    expect(req.request.method).toBe('PUT');
    expect(Object.keys(req.request.body)).toEqual(['titulo', 'descricao', 'perguntas']);
    req.flush(formulario);
    expect(await salvo).toEqual(formulario);
  });

  it('envia respostas com POST na coleção do formulário', async () => {
    const enviada = api.responder('exemplo', { 'exemplo-nome': 'Ana' });
    const req = http.expectOne('/api/formularios/exemplo/respostas');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ valores: { 'exemplo-nome': 'Ana' } });
    req.flush({ id: 'r1' });
    await enviada;
  });
});

describe('mensagemDeErro', () => {
  it('usa a mensagem e os detalhes do formato de erro da API', () => {
    const falha = new HttpErrorResponse({
      status: 422,
      error: { error: { code: 'VALIDATION_FAILED', message: 'A resposta tem problemas.', details: ['X.', 'Y.'] } },
    });
    expect(mensagemDeErro(falha)).toBe('A resposta tem problemas. X. Y.');
  });

  it('avisa quando não há conexão com a API', () => {
    expect(mensagemDeErro(new HttpErrorResponse({ status: 0 }))).toContain('Sem conexão com a API');
  });
});

import { TestBed } from '@angular/core/testing';
import { novoFormulario } from './formulario.model';
import { FormulariosApiFake, provideFormulariosApiFake } from './formularios.api.fake';
import { FormulariosService } from './formularios.service';

async function iniciar() {
  TestBed.configureTestingModule({ providers: provideFormulariosApiFake() });
  const servico = TestBed.inject(FormulariosService);
  await servico.recarregar();
  return { servico, api: TestBed.inject(FormulariosApiFake) };
}

describe('FormulariosService', () => {
  it('carrega formulários e respostas da API', async () => {
    const { servico } = await iniciar();
    expect(servico.carregando()).toBe(false);
    expect(servico.formularios().map((f) => f.id)).toEqual(['exemplo']);
  });

  it('salva na API (normalizado) e atualiza o espelho local', async () => {
    const { servico, api } = await iniciar();
    const formulario = { ...novoFormulario(), titulo: '  Novo  ' };
    await servico.salvar(formulario);
    await servico.salvar({ ...formulario, titulo: 'Renomeado' });

    expect(servico.formularios()).toHaveLength(2);
    expect(servico.buscar(formulario.id)?.titulo).toBe('Renomeado');
    expect(api.formularios.find((f) => f.id === formulario.id)?.titulo).toBe('Renomeado');
  });

  it('registra respostas e as apaga junto com o formulário', async () => {
    const { servico } = await iniciar();
    await servico.responder('exemplo', { 'exemplo-nome': 'Ana' });
    expect(servico.respostasDe('exemplo')[0].valores).toEqual({ 'exemplo-nome': 'Ana' });

    await servico.excluir('exemplo');
    expect(servico.formularios()).toEqual([]);
    expect(servico.respostasDe('exemplo')).toEqual([]);
  });

  it('não altera o espelho local quando a API recusa', async () => {
    const { servico, api } = await iniciar();
    vi.spyOn(api, 'excluirFormulario').mockRejectedValue(new Error('falhou'));
    await expect(servico.excluir('exemplo')).rejects.toThrow('falhou');
    expect(servico.formularios()).toHaveLength(1);
  });

  it('expõe o erro quando a API está fora do ar', async () => {
    const { servico, api } = await iniciar();
    vi.spyOn(api, 'listarFormularios').mockRejectedValue(new Error('rede'));
    await servico.recarregar();
    expect(servico.erroConexao()).toBe('Algo deu errado. Tente de novo.');
  });
});

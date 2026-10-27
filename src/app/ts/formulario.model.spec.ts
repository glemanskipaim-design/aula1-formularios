import {
  Formulario,
  normalizarFormulario,
  perguntasPendentes,
  Pergunta,
  respostasPorDia,
  resumirPergunta,
  Resposta,
  validarFormulario,
  validarResposta,
} from './formulario.model';

function pergunta(mudancas: Partial<Pergunta> = {}): Pergunta {
  return { id: 'p1', titulo: 'Pergunta', tipo: 'texto', obrigatoria: false, opcoes: [], ...mudancas };
}

function formulario(perguntas: Pergunta[], titulo = 'Teste'): Formulario {
  return { id: 'f1', titulo, descricao: '', perguntas, criadoEm: '2026-01-01T00:00:00.000Z' };
}

function resposta(valores: Resposta['valores']): Resposta {
  return { id: crypto.randomUUID(), formularioId: 'f1', enviadaEm: '2026-01-01T00:00:00.000Z', valores };
}

describe('validarFormulario', () => {
  it('aceita um formulário completo', () => {
    expect(validarFormulario(formulario([pergunta()]))).toEqual([]);
  });

  it('exige título e pelo menos uma pergunta', () => {
    expect(validarFormulario(formulario([], '  '))).toEqual([
      'Dê um título ao formulário.',
      'Adicione pelo menos uma pergunta.',
    ]);
  });

  it('acusa pergunta sem título e opções vazias ou repetidas', () => {
    const erros = validarFormulario(
      formulario([pergunta({ titulo: '', tipo: 'multipla', opcoes: ['Sim', ' Sim ', ''] })]),
    );
    expect(erros).toEqual([
      'A pergunta 1 está sem título.',
      'A pergunta 1 tem uma opção vazia.',
      'A pergunta 1 tem opções repetidas.',
    ]);
  });
});

describe('normalizarFormulario', () => {
  it('apara textos e descarta opções de perguntas abertas', () => {
    const normalizado = normalizarFormulario(
      formulario([
        pergunta({ titulo: ' Nome ', opcoes: ['sobra'] }),
        pergunta({ id: 'p2', tipo: 'caixas', opcoes: [' A ', 'B'] }),
      ], ' Título '),
    );
    expect(normalizado.titulo).toBe('Título');
    expect(normalizado.perguntas[0]).toMatchObject({ titulo: 'Nome', opcoes: [] });
    expect(normalizado.perguntas[1].opcoes).toEqual(['A', 'B']);
  });
});

describe('perguntasPendentes', () => {
  it('lista só as obrigatórias sem resposta', () => {
    const f = formulario([
      pergunta({ id: 'a', obrigatoria: true }),
      pergunta({ id: 'b', obrigatoria: true, tipo: 'caixas', opcoes: ['X'] }),
      pergunta({ id: 'c', obrigatoria: false }),
      pergunta({ id: 'd', obrigatoria: true }),
    ]);
    expect(perguntasPendentes(f, { a: '   ', b: [], d: 'ok' })).toEqual(['a', 'b']);
  });
});

describe('validarResposta', () => {
  const f = formulario([
    pergunta({ id: 'nome', obrigatoria: true }),
    pergunta({ id: 'nota', tipo: 'multipla', opcoes: ['Boa', 'Ruim'] }),
    pergunta({ id: 'temas', tipo: 'caixas', opcoes: ['A', 'B', 'C'] }),
  ]);

  it('aceita valores válidos, apara textos, ordena caixas e ignora ids desconhecidos', () => {
    const { erros, valores } = validarResposta(f, {
      nome: ' Ana ',
      nota: 'Boa',
      temas: ['C', 'A'],
      intruso: 'x',
    });
    expect(erros).toEqual([]);
    expect(valores).toEqual({ nome: 'Ana', nota: 'Boa', temas: ['A', 'C'] });
  });

  it('acusa obrigatória vazia, opção inventada e tipo errado', () => {
    const { erros } = validarResposta(f, { nome: '  ', nota: 'Ótima', temas: 'A' });
    expect(erros).toEqual([
      'A pergunta 1 é obrigatória.',
      'Resposta inválida na pergunta 2.',
      'Resposta inválida na pergunta 3.',
    ]);
  });

  it('trata entrada que não é objeto como resposta vazia', () => {
    expect(validarResposta(f, 'lixo').erros).toEqual(['A pergunta 1 é obrigatória.']);
  });
});

describe('respostasPorDia', () => {
  it('agrupa por dia local, do mais antigo até hoje', () => {
    const hoje = new Date(2026, 9, 26, 15); // segunda-feira
    const em = (dia: number, hora: number) => ({
      ...resposta({}),
      enviadaEm: new Date(2026, 9, dia, hora).toISOString(),
    });
    const dias = respostasPorDia([em(26, 0), em(26, 23), em(24, 12), em(10, 12)], hoje, 3);
    expect(dias).toEqual([
      { rotulo: 'sáb', total: 1 },
      { rotulo: 'dom', total: 0 },
      { rotulo: 'seg', total: 2 },
    ]);
  });
});

describe('resumirPergunta', () => {
  it('conta cada opção marcada e calcula o percentual', () => {
    const p = pergunta({ tipo: 'caixas', opcoes: ['A', 'B', 'C'] });
    const resumo = resumirPergunta(p, [
      resposta({ p1: ['A', 'B'] }),
      resposta({ p1: ['A'] }),
      resposta({}),
    ]);
    expect(resumo.respondidas).toBe(2);
    expect(resumo.contagens).toEqual([
      { opcao: 'A', total: 2, percentual: 100 },
      { opcao: 'B', total: 1, percentual: 50 },
      { opcao: 'C', total: 0, percentual: 0 },
    ]);
  });

  it('junta os textos das perguntas abertas, ignorando vazios', () => {
    const resumo = resumirPergunta(pergunta(), [resposta({ p1: 'Oi' }), resposta({ p1: '' })]);
    expect(resumo).toEqual({ respondidas: 1, contagens: [], textos: ['Oi'] });
  });
});

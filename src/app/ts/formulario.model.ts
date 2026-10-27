export type TipoPergunta = 'texto' | 'paragrafo' | 'multipla' | 'caixas';

export const TIPOS_PERGUNTA: readonly { valor: TipoPergunta; rotulo: string }[] = [
  { valor: 'texto', rotulo: 'Resposta curta' },
  { valor: 'paragrafo', rotulo: 'Parágrafo' },
  { valor: 'multipla', rotulo: 'Múltipla escolha' },
  { valor: 'caixas', rotulo: 'Caixas de seleção' },
];

export interface Pergunta {
  id: string;
  titulo: string;
  tipo: TipoPergunta;
  obrigatoria: boolean;
  opcoes: string[];
}

export interface Formulario {
  id: string;
  titulo: string;
  descricao: string;
  perguntas: Pergunta[];
  criadoEm: string;
}

/** Texto para perguntas abertas e múltipla escolha; lista para caixas de seleção. */
export type ValorResposta = string | string[];

export interface Resposta {
  id: string;
  formularioId: string;
  enviadaEm: string;
  valores: Record<string, ValorResposta>;
}

export interface ContagemOpcao {
  opcao: string;
  total: number;
  percentual: number;
}

export interface ResumoPergunta {
  respondidas: number;
  contagens: ContagemOpcao[];
  textos: string[];
}

export interface RespostasDoDia {
  /** Abreviação do dia da semana, ex.: "seg". */
  rotulo: string;
  total: number;
}

const DIAS_DA_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/** Uma letra por opção na tela de responder (A–Z). */
export const MAX_OPCOES = 26;
export const MAX_PERGUNTAS = 100;
export const MAX_TEXTO_RESPOSTA = 5000;

export function rotuloTipo(tipo: TipoPergunta): string {
  return TIPOS_PERGUNTA.find((t) => t.valor === tipo)?.rotulo ?? tipo;
}

export function temOpcoes(tipo: TipoPergunta): boolean {
  return tipo === 'multipla' || tipo === 'caixas';
}

export function novaPergunta(): Pergunta {
  return {
    id: crypto.randomUUID(),
    titulo: '',
    tipo: 'multipla',
    obrigatoria: false,
    opcoes: ['Opção 1'],
  };
}

export function novoFormulario(): Formulario {
  return {
    id: crypto.randomUUID(),
    titulo: 'Formulário sem título',
    descricao: '',
    perguntas: [novaPergunta()],
    criadoEm: new Date().toISOString(),
  };
}

/** Lista os problemas que impedem salvar o formulário (vazia = pode salvar). */
export function validarFormulario(formulario: Formulario): string[] {
  const erros: string[] = [];
  if (!formulario.titulo.trim()) {
    erros.push('Dê um título ao formulário.');
  }
  if (formulario.perguntas.length === 0) {
    erros.push('Adicione pelo menos uma pergunta.');
  }
  if (formulario.perguntas.length > MAX_PERGUNTAS) {
    erros.push(`Use no máximo ${MAX_PERGUNTAS} perguntas.`);
  }
  formulario.perguntas.forEach((pergunta, i) => {
    const numero = i + 1;
    if (!pergunta.titulo.trim()) {
      erros.push(`A pergunta ${numero} está sem título.`);
    }
    if (temOpcoes(pergunta.tipo)) {
      const opcoes = pergunta.opcoes.map((opcao) => opcao.trim());
      if (opcoes.some((opcao) => !opcao)) {
        erros.push(`A pergunta ${numero} tem uma opção vazia.`);
      }
      if (new Set(opcoes).size !== opcoes.length) {
        erros.push(`A pergunta ${numero} tem opções repetidas.`);
      }
      if (opcoes.length > MAX_OPCOES) {
        erros.push(`A pergunta ${numero} tem mais de ${MAX_OPCOES} opções.`);
      }
    }
  });
  return erros;
}

/** Remove espaços sobrando e descarta opções de perguntas abertas. */
export function normalizarFormulario(formulario: Formulario): Formulario {
  return {
    ...formulario,
    titulo: formulario.titulo.trim(),
    descricao: formulario.descricao.trim(),
    perguntas: formulario.perguntas.map((pergunta) => ({
      ...pergunta,
      titulo: pergunta.titulo.trim(),
      opcoes: temOpcoes(pergunta.tipo) ? pergunta.opcoes.map((opcao) => opcao.trim()) : [],
    })),
  };
}

export function respondida(valor: ValorResposta | undefined): valor is ValorResposta {
  return Array.isArray(valor) ? valor.length > 0 : !!valor?.trim();
}

/** Ids das perguntas obrigatórias ainda sem resposta. */
export function perguntasPendentes(
  formulario: Formulario,
  valores: Record<string, ValorResposta>,
): string[] {
  return formulario.perguntas
    .filter((pergunta) => pergunta.obrigatoria && !respondida(valores[pergunta.id]))
    .map((pergunta) => pergunta.id);
}

/**
 * Confere valores recebidos de fora (ex.: o corpo de um POST na API) contra o formulário.
 * Devolve os erros e só os valores válidos, aparados; ids de pergunta desconhecidos são ignorados.
 */
export function validarResposta(
  formulario: Formulario,
  entrada: unknown,
): { erros: string[]; valores: Record<string, ValorResposta> } {
  const bruto =
    entrada && typeof entrada === 'object' && !Array.isArray(entrada)
      ? (entrada as Record<string, unknown>)
      : {};
  const erros: string[] = [];
  const valores: Record<string, ValorResposta> = {};

  formulario.perguntas.forEach((pergunta, i) => {
    const numero = i + 1;
    const valor = bruto[pergunta.id];
    let invalido = false;

    if (valor === undefined || valor === null) {
      // Sem resposta: só é problema se for obrigatória (conferido abaixo).
    } else if (pergunta.tipo === 'caixas') {
      const lista = Array.isArray(valor) ? valor : null;
      invalido = !lista || lista.some((v) => typeof v !== 'string' || !pergunta.opcoes.includes(v));
      if (lista && !invalido) {
        valores[pergunta.id] = pergunta.opcoes.filter((opcao) => lista.includes(opcao));
      }
    } else if (typeof valor !== 'string' || valor.length > MAX_TEXTO_RESPOSTA) {
      invalido = true;
    } else if (pergunta.tipo === 'multipla' && valor && !pergunta.opcoes.includes(valor)) {
      invalido = true;
    } else if (valor.trim()) {
      valores[pergunta.id] = valor.trim();
    }

    if (invalido) {
      erros.push(`Resposta inválida na pergunta ${numero}.`);
    } else if (pergunta.obrigatoria && !respondida(valores[pergunta.id])) {
      erros.push(`A pergunta ${numero} é obrigatória.`);
    }
  });
  return { erros, valores };
}

/** Formulário criado na primeira execução, para o painel não começar vazio. */
export function formularioDeExemplo(): Formulario {
  return {
    id: 'exemplo',
    titulo: 'Pesquisa de satisfação da aula',
    descricao: 'Formulário de exemplo: responda, edite ou exclua à vontade.',
    criadoEm: new Date().toISOString(),
    perguntas: [
      { id: 'exemplo-nome', titulo: 'Seu nome', tipo: 'texto', obrigatoria: true, opcoes: [] },
      {
        id: 'exemplo-nota',
        titulo: 'Como você avalia a aula?',
        tipo: 'multipla',
        obrigatoria: true,
        opcoes: ['Ótima', 'Boa', 'Regular', 'Ruim'],
      },
      {
        id: 'exemplo-temas',
        titulo: 'Quais temas você gostou?',
        tipo: 'caixas',
        obrigatoria: false,
        opcoes: ['Angular', 'TypeScript', 'HTML e CSS'],
      },
      { id: 'exemplo-sugestoes', titulo: 'Sugestões', tipo: 'paragrafo', obrigatoria: false, opcoes: [] },
    ],
  };
}

function chaveDoDia(data: Date): string {
  return `${data.getFullYear()}-${data.getMonth()}-${data.getDate()}`;
}

/** Quantas respostas chegaram em cada um dos últimos `dias` dias (fuso local), do mais antigo a hoje. */
export function respostasPorDia(respostas: Resposta[], hoje: Date, dias = 7): RespostasDoDia[] {
  const totais = new Map<string, number>();
  for (const resposta of respostas) {
    const chave = chaveDoDia(new Date(resposta.enviadaEm));
    totais.set(chave, (totais.get(chave) ?? 0) + 1);
  }
  return Array.from({ length: dias }, (_, i) => {
    const data = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - (dias - 1 - i));
    return { rotulo: DIAS_DA_SEMANA[data.getDay()], total: totais.get(chaveDoDia(data)) ?? 0 };
  });
}

export function resumirPergunta(pergunta: Pergunta, respostas: Resposta[]): ResumoPergunta {
  const valores = respostas.map((resposta) => resposta.valores[pergunta.id]).filter(respondida);
  if (!temOpcoes(pergunta.tipo)) {
    const textos = valores.filter((valor): valor is string => typeof valor === 'string');
    return { respondidas: valores.length, contagens: [], textos };
  }
  const contagens = pergunta.opcoes.map((opcao) => {
    const total = valores.filter((valor) =>
      Array.isArray(valor) ? valor.includes(opcao) : valor === opcao,
    ).length;
    const percentual = valores.length ? Math.round((total / valores.length) * 100) : 0;
    return { opcao, total, percentual };
  });
  return { respondidas: valores.length, contagens, textos: [] };
}

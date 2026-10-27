import {
  normalizarFormulario,
  TIPOS_PERGUNTA,
  validarFormulario,
  type Formulario,
  type Pergunta,
  type TipoPergunta,
} from '../src/app/ts/formulario.model.ts';

const MAX_TITULO = 200;
const MAX_DESCRICAO = 2000;
const MAX_TITULO_PERGUNTA = 500;
const MAX_OPCAO = 200;
const ID_VALIDO = /^[\w-]{1,64}$/;
const TIPOS = new Set<string>(TIPOS_PERGUNTA.map((tipo) => tipo.valor));

type Resultado<T> = { ok: true; valor: T } | { ok: false; erros: string[] };

function objeto(valor: unknown): Record<string, unknown> | null {
  return valor && typeof valor === 'object' && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : null;
}

function textoAte(valor: unknown, limite: number): valor is string {
  return typeof valor === 'string' && valor.length <= limite;
}

export function idValido(id: string): boolean {
  return ID_VALIDO.test(id);
}

function interpretarPergunta(entrada: unknown, numero: number, erros: string[]): Pergunta | null {
  const bruto = objeto(entrada);
  if (!bruto) {
    erros.push(`A pergunta ${numero} não é um objeto.`);
    return null;
  }
  const { id, titulo, tipo, obrigatoria, opcoes } = bruto;
  const errosAntes = erros.length;
  if (typeof id !== 'string' || !idValido(id)) erros.push(`A pergunta ${numero} tem id inválido.`);
  if (!textoAte(titulo, MAX_TITULO_PERGUNTA)) erros.push(`A pergunta ${numero} tem título inválido.`);
  if (typeof tipo !== 'string' || !TIPOS.has(tipo)) erros.push(`A pergunta ${numero} tem tipo inválido.`);
  if (typeof obrigatoria !== 'boolean') erros.push(`A pergunta ${numero}: "obrigatoria" deve ser true/false.`);
  if (!Array.isArray(opcoes) || opcoes.some((opcao) => !textoAte(opcao, MAX_OPCAO))) {
    erros.push(`A pergunta ${numero} tem opções inválidas.`);
  }
  if (erros.length > errosAntes) {
    return null;
  }
  return {
    id: id as string,
    titulo: titulo as string,
    tipo: tipo as TipoPergunta,
    obrigatoria: obrigatoria as boolean,
    opcoes: opcoes as string[],
  };
}

/**
 * Transforma o corpo de um PUT em Formulario: confere a forma (tipos, tamanhos)
 * e depois as mesmas regras que o editor do front usa. Campos extras são descartados.
 */
export function interpretarFormulario(
  entrada: unknown,
  id: string,
  criadoEm: string,
): Resultado<Formulario> {
  const bruto = objeto(entrada);
  if (!bruto) {
    return { ok: false, erros: ['O corpo deve ser um objeto JSON.'] };
  }
  const erros: string[] = [];
  const { titulo, descricao = '', perguntas } = bruto;
  if (!textoAte(titulo, MAX_TITULO)) erros.push(`"titulo" deve ser texto de até ${MAX_TITULO} caracteres.`);
  if (!textoAte(descricao, MAX_DESCRICAO)) erros.push(`"descricao" deve ser texto de até ${MAX_DESCRICAO} caracteres.`);
  if (!Array.isArray(perguntas)) erros.push('"perguntas" deve ser uma lista.');
  if (erros.length > 0 || !Array.isArray(perguntas)) {
    return { ok: false, erros };
  }

  const lidas = perguntas.map((pergunta, i) => interpretarPergunta(pergunta, i + 1, erros));
  if (erros.length > 0) {
    return { ok: false, erros };
  }
  if (new Set(lidas.map((p) => p!.id)).size !== lidas.length) {
    return { ok: false, erros: ['Há perguntas com o mesmo id.'] };
  }

  const formulario = normalizarFormulario({
    id,
    titulo: titulo as string,
    descricao: descricao as string,
    perguntas: lidas as Pergunta[],
    criadoEm,
  });
  const errosDeRegra = validarFormulario(formulario);
  return errosDeRegra.length > 0 ? { ok: false, erros: errosDeRegra } : { ok: true, valor: formulario };
}

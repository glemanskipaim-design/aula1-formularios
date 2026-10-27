import { Provider } from '@angular/core';
import { Formulario, formularioDeExemplo, Resposta, ValorResposta } from './formulario.model';
import { FormulariosApi } from './formularios.api';

/** Substituto da API para testes: guarda tudo em memória e começa com o formulário de exemplo. */
export class FormulariosApiFake implements Pick<FormulariosApi, keyof FormulariosApi> {
  formularios: Formulario[] = [formularioDeExemplo()];
  respostas: Resposta[] = [];

  async listarFormularios(): Promise<Formulario[]> {
    return structuredClone(this.formularios);
  }

  async listarRespostas(): Promise<Resposta[]> {
    return structuredClone(this.respostas);
  }

  async salvarFormulario(formulario: Formulario): Promise<Formulario> {
    this.formularios = [...this.formularios.filter((f) => f.id !== formulario.id), formulario];
    return structuredClone(formulario);
  }

  async excluirFormulario(id: string): Promise<void> {
    this.formularios = this.formularios.filter((f) => f.id !== id);
    this.respostas = this.respostas.filter((r) => r.formularioId !== id);
  }

  async responder(formularioId: string, valores: Record<string, ValorResposta>): Promise<Resposta> {
    const resposta = { id: crypto.randomUUID(), formularioId, enviadaEm: new Date().toISOString(), valores };
    this.respostas.push(resposta);
    return structuredClone(resposta);
  }
}

export function provideFormulariosApiFake(): Provider[] {
  return [FormulariosApiFake, { provide: FormulariosApi, useExisting: FormulariosApiFake }];
}

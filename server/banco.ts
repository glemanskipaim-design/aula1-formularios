import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import {
  formularioDeExemplo,
  type Formulario,
  type Resposta,
} from '../src/app/ts/formulario.model.ts';

export interface Dados {
  formularios: Formulario[];
  respostas: Resposta[];
}

/** "Banco de dados" em um arquivo JSON: lido uma vez na partida, regravado a cada mudança. */
export class Banco {
  readonly dados: Dados;
  private readonly arquivo: string;

  constructor(arquivo: string) {
    this.arquivo = arquivo;
    if (existsSync(arquivo)) {
      this.dados = JSON.parse(readFileSync(arquivo, 'utf8')) as Dados;
    } else {
      this.dados = { formularios: [formularioDeExemplo()], respostas: [] };
      this.salvar();
    }
  }

  salvar(): void {
    // Grava num arquivo temporário e troca de nome: se o processo cair no meio,
    // o db.json antigo continua inteiro em vez de ficar pela metade.
    const temporario = `${this.arquivo}.tmp`;
    writeFileSync(temporario, JSON.stringify(this.dados, null, 2));
    renameSync(temporario, this.arquivo);
  }
}

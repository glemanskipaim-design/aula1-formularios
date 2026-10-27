import { Component, computed, inject, input, linkedSignal, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  MAX_OPCOES,
  novaPergunta,
  novoFormulario,
  Pergunta,
  TipoPergunta,
  TIPOS_PERGUNTA,
  temOpcoes,
  validarFormulario,
} from './formulario.model';
import { mensagemDeErro } from './formularios.api';
import { FormulariosService } from './formularios.service';

@Component({
  selector: 'app-editor',
  imports: [RouterLink],
  templateUrl: '../html/editor.html',
  styleUrl: '../css/editor.css',
})
export class Editor {
  private readonly servico = inject(FormulariosService);
  private readonly router = inject(Router);

  /** Herdado da rota `f/:id/editar`; ausente em `novo`. */
  readonly id = input<string>();

  protected readonly tipos = TIPOS_PERGUNTA;
  protected readonly temOpcoes = temOpcoes;

  // Cópia de trabalho: só vai para o serviço quando o usuário clica em Salvar.
  protected readonly rascunho = linkedSignal(() => {
    const id = this.id();
    const existente = id ? untracked(() => this.servico.buscar(id)) : undefined;
    return existente ? structuredClone(existente) : novoFormulario();
  });
  protected readonly tentouSalvar = signal(false);
  protected readonly salvando = signal(false);
  protected readonly erroServidor = signal<string | null>(null);
  protected readonly maxOpcoes = MAX_OPCOES;
  protected readonly erros = computed(() => validarFormulario(this.rascunho()));
  protected readonly destinoCancelar = computed(() => {
    const id = this.id();
    return id ? ['/f', id] : ['/'];
  });

  protected definirTitulo(titulo: string): void {
    this.rascunho.update((f) => ({ ...f, titulo }));
  }

  protected definirDescricao(descricao: string): void {
    this.rascunho.update((f) => ({ ...f, descricao }));
  }

  protected adicionarPergunta(): void {
    this.atualizarPerguntas((perguntas) => [...perguntas, novaPergunta()]);
  }

  protected removerPergunta(id: string): void {
    this.atualizarPerguntas((perguntas) => perguntas.filter((p) => p.id !== id));
  }

  protected moverPergunta(indice: number, deslocamento: -1 | 1): void {
    this.atualizarPerguntas((perguntas) => {
      const copia = [...perguntas];
      const [pergunta] = copia.splice(indice, 1);
      copia.splice(indice + deslocamento, 0, pergunta);
      return copia;
    });
  }

  protected alterarPergunta(id: string, mudancas: Partial<Pergunta>): void {
    this.atualizarPerguntas((perguntas) =>
      perguntas.map((p) => (p.id === id ? { ...p, ...mudancas } : p)),
    );
  }

  protected alterarTipo(pergunta: Pergunta, valor: string): void {
    const tipo = valor as TipoPergunta;
    const precisaOpcao = temOpcoes(tipo) && pergunta.opcoes.length === 0;
    this.alterarPergunta(pergunta.id, { tipo, opcoes: precisaOpcao ? ['Opção 1'] : pergunta.opcoes });
  }

  protected adicionarOpcao(pergunta: Pergunta): void {
    const opcoes = [...pergunta.opcoes, `Opção ${pergunta.opcoes.length + 1}`];
    this.alterarPergunta(pergunta.id, { opcoes });
  }

  protected alterarOpcao(pergunta: Pergunta, indice: number, texto: string): void {
    const opcoes = pergunta.opcoes.map((opcao, i) => (i === indice ? texto : opcao));
    this.alterarPergunta(pergunta.id, { opcoes });
  }

  protected removerOpcao(pergunta: Pergunta, indice: number): void {
    const opcoes = pergunta.opcoes.filter((_, i) => i !== indice);
    this.alterarPergunta(pergunta.id, { opcoes });
  }

  protected async salvar(): Promise<void> {
    this.tentouSalvar.set(true);
    this.erroServidor.set(null);
    if (this.erros().length > 0 || this.salvando()) {
      return;
    }
    this.salvando.set(true);
    try {
      await this.servico.salvar(this.rascunho());
      await this.router.navigate(['/f', this.rascunho().id]);
    } catch (falha) {
      this.erroServidor.set(mensagemDeErro(falha));
    } finally {
      this.salvando.set(false);
    }
  }

  private atualizarPerguntas(transformar: (perguntas: Pergunta[]) => Pergunta[]): void {
    this.rascunho.update((f) => ({ ...f, perguntas: transformar(f.perguntas) }));
  }
}

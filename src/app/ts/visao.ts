import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { Router } from '@angular/router';
import { respostasPorDia, rotuloTipo } from './formulario.model';
import { mensagemDeErro } from './formularios.api';
import { FormulariosService } from './formularios.service';

@Component({
  selector: 'app-visao',
  imports: [DatePipe],
  templateUrl: '../html/visao.html',
  styleUrl: '../css/visao.css',
})
export class Visao {
  private readonly servico = inject(FormulariosService);
  private readonly router = inject(Router);
  private readonly hoje = new Date();

  /** Herdado da rota `f/:id`. */
  readonly id = input.required<string>();

  protected readonly rotuloTipo = rotuloTipo;
  protected readonly formulario = computed(() => this.servico.buscar(this.id()));
  protected readonly respostas = computed(() => this.servico.respostasDe(this.id()));
  protected readonly ultimosDias = computed(() => respostasPorDia(this.respostas(), this.hoje));
  protected readonly maiorDia = computed(() => Math.max(1, ...this.ultimosDias().map((d) => d.total)));
  protected readonly ultimaResposta = computed(() => this.respostas().at(-1)?.enviadaEm);
  protected readonly link = computed(() => {
    const caminho = this.router.serializeUrl(this.router.createUrlTree(['/responder', this.id()]));
    return `${window.location.origin}${caminho}`;
  });

  // Voltam ao estado inicial quando outro formulário é selecionado.
  protected readonly copiado = linkedSignal(() => (this.id(), false));
  protected readonly confirmandoExclusao = linkedSignal(() => (this.id(), false));
  protected readonly erroExclusao = linkedSignal<string, string | null>({
    source: this.id,
    computation: () => null,
  });

  protected async copiarLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.link());
      this.copiado.set(true);
    } catch {
      // Sem permissão de área de transferência: o link continua visível para copiar à mão.
    }
  }

  protected async excluir(): Promise<void> {
    this.erroExclusao.set(null);
    try {
      await this.servico.excluir(this.id());
      await this.router.navigate(['/']);
    } catch (falha) {
      this.erroExclusao.set(mensagemDeErro(falha));
    }
  }
}

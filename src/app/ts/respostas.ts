import { DatePipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { resumirPergunta, ValorResposta } from './formulario.model';
import { FormulariosService } from './formularios.service';

@Component({
  selector: 'app-respostas',
  imports: [DatePipe],
  templateUrl: '../html/respostas.html',
  styleUrl: '../css/respostas.css',
})
export class Respostas {
  private readonly servico = inject(FormulariosService);

  /** Herdado da rota `f/:id/respostas`. */
  readonly id = input.required<string>();

  protected readonly formulario = computed(() => this.servico.buscar(this.id()));
  protected readonly respostas = computed(() => this.servico.respostasDe(this.id()));
  protected readonly resumo = computed(() => {
    const formulario = this.formulario();
    const respostas = this.respostas();
    return (formulario?.perguntas ?? []).map((pergunta) => ({
      pergunta,
      ...resumirPergunta(pergunta, respostas),
    }));
  });

  protected formatar(valor: ValorResposta | undefined): string {
    if (Array.isArray(valor)) {
      return valor.join(', ');
    }
    return valor || '—';
  }
}

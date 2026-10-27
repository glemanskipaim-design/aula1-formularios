import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { respostasPorDia } from './formulario.model';
import { FormulariosService } from './formularios.service';

/** Página inicial do painel: números gerais e respostas recentes. */
@Component({
  selector: 'app-inicio',
  imports: [DatePipe, RouterLink],
  templateUrl: '../html/inicio.html',
  styleUrl: '../css/inicio.css',
})
export class Inicio {
  protected readonly servico = inject(FormulariosService);
  private readonly hoje = new Date();

  protected readonly respostasHoje = computed(
    () => respostasPorDia(this.servico.respostas(), this.hoje, 1)[0].total,
  );
  protected readonly recentes = computed(() =>
    this.servico
      .respostas()
      .slice(-5)
      .reverse()
      .map((resposta) => ({
        ...resposta,
        titulo: this.servico.buscar(resposta.formularioId)?.titulo ?? 'Formulário excluído',
      })),
  );
}

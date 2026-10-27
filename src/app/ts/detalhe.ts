import { Component, computed, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FormulariosService } from './formularios.service';

/** Cabeçalho e abas do formulário selecionado; a aba ativa vem do router-outlet. */
@Component({
  selector: 'app-detalhe',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: '../html/detalhe.html',
  styleUrl: '../css/detalhe.css',
})
export class Detalhe {
  protected readonly servico = inject(FormulariosService);

  /** Vem da rota `f/:id`. */
  readonly id = input.required<string>();

  protected readonly formulario = computed(() => this.servico.buscar(this.id()));
  protected readonly totalRespostas = computed(() => this.servico.respostasDe(this.id()).length);
}

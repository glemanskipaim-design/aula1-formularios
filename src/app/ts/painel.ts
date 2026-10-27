import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FormulariosService } from './formularios.service';

/** Moldura do painel: lista de formulários à esquerda, conteúdo à direita. */
@Component({
  selector: 'app-painel',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: '../html/painel.html',
  styleUrl: '../css/painel.css',
})
export class Painel {
  protected readonly servico = inject(FormulariosService);

  // Mais recentes primeiro.
  protected readonly formularios = computed(() => [...this.servico.formularios()].reverse());
}

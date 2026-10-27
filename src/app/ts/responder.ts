import {
  afterRenderEffect,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Pergunta, respondida, temOpcoes, ValorResposta } from './formulario.model';
import { mensagemDeErro } from './formularios.api';
import { FormulariosService } from './formularios.service';

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Responde no estilo conversa: uma pergunta por tela, navegação por teclado. */
@Component({
  selector: 'app-responder',
  imports: [RouterLink],
  templateUrl: '../html/responder.html',
  styleUrl: '../css/responder.css',
  host: { '(document:keydown)': 'aoTeclar($event)' },
})
export class Responder {
  private readonly servico = inject(FormulariosService);

  /** Vem da rota `responder/:id`. */
  readonly id = input.required<string>();

  protected readonly letras = LETRAS;
  protected readonly formulario = computed(() => this.servico.buscar(this.id()));
  protected readonly valores = signal<Record<string, ValorResposta>>({});
  /** 0 = tela de boas-vindas; 1..total = perguntas. */
  protected readonly passo = signal(0);
  protected readonly enviado = signal(false);
  protected readonly faltaResponder = signal(false);
  protected readonly enviando = signal(false);
  protected readonly erroEnvio = signal<string | null>(null);
  protected readonly carregando = this.servico.carregando;
  protected readonly erroConexao = this.servico.erroConexao;

  protected readonly total = computed(() => this.formulario()?.perguntas.length ?? 0);
  protected readonly pergunta = computed(() => this.formulario()?.perguntas[this.passo() - 1]);
  // Lista de um item com `track` pelo id: recria o bloco a cada pergunta, o que
  // reinicia a animação de entrada e move o foco para a pergunta nova.
  protected readonly perguntaAtual = computed(() => {
    const pergunta = this.pergunta();
    return pergunta ? [pergunta] : [];
  });
  protected readonly ultima = computed(() => this.passo() === this.total());
  protected readonly progresso = computed(() => {
    if (this.enviado()) {
      return 100;
    }
    const total = this.total();
    return total ? Math.round((Math.max(0, this.passo() - 1) / total) * 100) : 0;
  });

  private readonly foco = viewChild<ElementRef<HTMLElement>>('foco');

  constructor() {
    afterRenderEffect(() => {
      const bloco = this.foco()?.nativeElement;
      if (!bloco) {
        return;
      }
      // Em pergunta aberta, já deixa o cursor no campo; nas demais, foca o bloco.
      const campo = bloco.querySelector<HTMLElement>('input[type=text], textarea');
      (campo ?? bloco).focus();
    });
  }

  protected texto(pergunta: Pergunta): string {
    const valor = this.valores()[pergunta.id];
    return typeof valor === 'string' ? valor : '';
  }

  protected marcada(pergunta: Pergunta, opcao: string): boolean {
    const valor = this.valores()[pergunta.id];
    return Array.isArray(valor) && valor.includes(opcao);
  }

  protected dica(pergunta: Pergunta): string {
    switch (pergunta.tipo) {
      case 'texto':
        return 'Enter ↵ para continuar';
      case 'paragrafo':
        return 'Shift + Enter para nova linha';
      case 'multipla':
        return `Tecle ${this.intervaloLetras(pergunta)} para escolher`;
      case 'caixas':
        return `Escolha quantas quiser · tecle ${this.intervaloLetras(pergunta)}`;
    }
  }

  protected definir(pergunta: Pergunta, valor: string): void {
    this.valores.update((valores) => ({ ...valores, [pergunta.id]: valor }));
    this.faltaResponder.set(false);
  }

  protected escolher(pergunta: Pergunta, opcao: string): void {
    if (pergunta.tipo === 'multipla') {
      this.definir(pergunta, opcao);
      return;
    }
    const marcar = !this.marcada(pergunta, opcao);
    this.valores.update((valores) => {
      const atuais = valores[pergunta.id];
      const lista = Array.isArray(atuais) ? atuais.filter((o) => o !== opcao) : [];
      // Mantém a ordem das opções do formulário, não a ordem dos cliques.
      const marcadas = marcar ? pergunta.opcoes.filter((o) => o === opcao || lista.includes(o)) : lista;
      return { ...valores, [pergunta.id]: marcadas };
    });
    this.faltaResponder.set(false);
  }

  protected comecar(): void {
    this.passo.set(1);
  }

  protected async avancar(): Promise<void> {
    const pergunta = this.pergunta();
    const formulario = this.formulario();
    if (!pergunta || !formulario) {
      return;
    }
    if (pergunta.obrigatoria && !respondida(this.valores()[pergunta.id])) {
      this.faltaResponder.set(true);
      return;
    }
    if (!this.ultima()) {
      this.passo.update((passo) => passo + 1);
      return;
    }
    if (this.enviando()) {
      return;
    }
    this.enviando.set(true);
    this.erroEnvio.set(null);
    try {
      await this.servico.responder(formulario.id, this.valores());
      this.enviado.set(true);
    } catch (falha) {
      this.erroEnvio.set(mensagemDeErro(falha));
    } finally {
      this.enviando.set(false);
    }
  }

  protected voltar(): void {
    this.faltaResponder.set(false);
    this.passo.update((passo) => Math.max(1, passo - 1));
  }

  protected recomecar(): void {
    this.valores.set({});
    this.faltaResponder.set(false);
    this.erroEnvio.set(null);
    this.enviado.set(false);
    this.passo.set(0);
  }

  protected aoTeclar(evento: KeyboardEvent): void {
    if (this.enviado() || !this.formulario() || evento.ctrlKey || evento.metaKey || evento.altKey) {
      return;
    }
    const alvo = evento.target instanceof HTMLElement ? evento.target : null;
    // Em botões e links o próprio navegador trata Enter/Espaço.
    if (alvo?.closest('button, a')) {
      return;
    }
    const digitando = alvo instanceof HTMLTextAreaElement
      || (alvo instanceof HTMLInputElement && alvo.type === 'text');

    if (evento.key === 'Enter') {
      if (alvo instanceof HTMLTextAreaElement && evento.shiftKey) {
        return;
      }
      evento.preventDefault();
      if (this.passo() === 0) {
        this.comecar();
      } else {
        void this.avancar();
      }
      return;
    }

    const pergunta = this.pergunta();
    if (!pergunta || !temOpcoes(pergunta.tipo) || digitando || evento.key.length !== 1) {
      return;
    }
    const indice = LETRAS.indexOf(evento.key.toUpperCase());
    if (indice >= 0 && indice < pergunta.opcoes.length) {
      evento.preventDefault();
      this.escolher(pergunta, pergunta.opcoes[indice]);
    }
  }

  private intervaloLetras(pergunta: Pergunta): string {
    const ultima = LETRAS[Math.min(pergunta.opcoes.length, LETRAS.length) - 1];
    return ultima === 'A' ? 'A' : `A–${ultima}`;
  }
}

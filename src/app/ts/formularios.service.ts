import { inject, Service, signal } from '@angular/core';
import { Formulario, normalizarFormulario, Resposta, ValorResposta } from './formulario.model';
import { FormulariosApi, mensagemDeErro } from './formularios.api';

/**
 * Estado dos formulários no front: espelho em signals do que está na API.
 * As telas leem daqui; as mudanças vão primeiro para a API e só então atualizam o espelho.
 */
@Service()
export class FormulariosService {
  private readonly api = inject(FormulariosApi);
  private readonly listaFormularios = signal<Formulario[]>([]);
  private readonly listaRespostas = signal<Resposta[]>([]);
  private readonly estaCarregando = signal(true);
  private readonly falhaConexao = signal<string | null>(null);

  readonly formularios = this.listaFormularios.asReadonly();
  readonly respostas = this.listaRespostas.asReadonly();
  /** Verdadeiro até a primeira busca na API terminar. */
  readonly carregando = this.estaCarregando.asReadonly();
  readonly erroConexao = this.falhaConexao.asReadonly();

  constructor() {
    void this.recarregar();
    // O formulário costuma ser respondido em outra aba: ao voltar para esta,
    // busca de novo para o painel mostrar as respostas novas.
    window.addEventListener('focus', () => void this.recarregar());
  }

  async recarregar(): Promise<void> {
    try {
      const [formularios, respostas] = await Promise.all([
        this.api.listarFormularios(),
        this.api.listarRespostas(),
      ]);
      this.listaFormularios.set(formularios);
      this.listaRespostas.set(respostas);
      this.falhaConexao.set(null);
    } catch (falha) {
      this.falhaConexao.set(mensagemDeErro(falha));
    } finally {
      this.estaCarregando.set(false);
    }
  }

  buscar(id: string): Formulario | undefined {
    return this.listaFormularios().find((formulario) => formulario.id === id);
  }

  respostasDe(formularioId: string): Resposta[] {
    return this.listaRespostas().filter((resposta) => resposta.formularioId === formularioId);
  }

  /** Cria o formulário, ou substitui o existente com o mesmo id. Lança erro se a API recusar. */
  async salvar(formulario: Formulario): Promise<void> {
    const salvo = await this.api.salvarFormulario(normalizarFormulario(formulario));
    this.listaFormularios.update((lista) =>
      lista.some((f) => f.id === salvo.id)
        ? lista.map((f) => (f.id === salvo.id ? salvo : f))
        : [...lista, salvo],
    );
  }

  /** Exclui o formulário junto com todas as respostas dele. */
  async excluir(id: string): Promise<void> {
    await this.api.excluirFormulario(id);
    this.listaFormularios.update((lista) => lista.filter((f) => f.id !== id));
    this.listaRespostas.update((lista) => lista.filter((r) => r.formularioId !== id));
  }

  async responder(formularioId: string, valores: Record<string, ValorResposta>): Promise<void> {
    const resposta = await this.api.responder(formularioId, valores);
    this.listaRespostas.update((lista) => [...lista, resposta]);
  }
}

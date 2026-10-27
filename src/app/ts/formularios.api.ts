import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Formulario, Resposta, ValorResposta } from './formulario.model';

/** Formato de erro da API: { error: { code, message, details } } (ver server/app.ts). */
interface ErroApi {
  error?: { code?: string; message?: string; details?: unknown };
}

/** Converte qualquer falha de chamada à API numa frase para mostrar ao usuário. */
export function mensagemDeErro(falha: unknown): string {
  if (falha instanceof HttpErrorResponse) {
    if (falha.status === 0 || falha.status === 504) {
      return 'Sem conexão com a API. Ela está rodando? (npm start)';
    }
    const corpo = (falha.error ?? {}) as ErroApi;
    const detalhes = Array.isArray(corpo.error?.details) ? ` ${corpo.error.details.join(' ')}` : '';
    if (corpo.error?.message) {
      return `${corpo.error.message}${detalhes}`;
    }
  }
  return 'Algo deu errado. Tente de novo.';
}

/** Chamadas HTTP cruas à API Node (`/api`, repassado pelo proxy do `ng serve`). */
@Service()
export class FormulariosApi {
  private readonly http = inject(HttpClient);

  listarFormularios(): Promise<Formulario[]> {
    return firstValueFrom(this.http.get<Formulario[]>('/api/formularios'));
  }

  listarRespostas(): Promise<Resposta[]> {
    return firstValueFrom(this.http.get<Resposta[]>('/api/respostas'));
  }

  /** Cria ou substitui (PUT com o id gerado no front). */
  salvarFormulario(formulario: Formulario): Promise<Formulario> {
    const { titulo, descricao, perguntas } = formulario;
    return firstValueFrom(
      this.http.put<Formulario>(`/api/formularios/${encodeURIComponent(formulario.id)}`, {
        titulo,
        descricao,
        perguntas,
      }),
    );
  }

  excluirFormulario(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/formularios/${encodeURIComponent(id)}`));
  }

  responder(formularioId: string, valores: Record<string, ValorResposta>): Promise<Resposta> {
    return firstValueFrom(
      this.http.post<Resposta>(`/api/formularios/${encodeURIComponent(formularioId)}/respostas`, { valores }),
    );
  }
}

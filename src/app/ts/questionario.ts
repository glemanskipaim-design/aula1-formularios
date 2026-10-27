import { Component, signal } from '@angular/core';
import { email, form, FormField, minLength, pattern, required, submit } from '@angular/forms/signals';

interface Contato {
  nome: string;
  email: string;
  telefone: string;
}

const CONTATO_VAZIO: Contato = { nome: '', email: '', telefone: '' };

// Aceita (11) 91234-5678, 11 91234-5678, 1134567890 etc.
const TELEFONE_REGEX = /^\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/;

@Component({
  selector: 'app-questionario',
  imports: [FormField],
  templateUrl: '../html/questionario.html',
  styleUrl: '../css/questionario.css',
})
export class Questionario {
  protected readonly contato = signal<Contato>({ ...CONTATO_VAZIO });
  protected readonly enviado = signal<Contato | null>(null);

  protected readonly contatoForm = form(this.contato, (campo) => {
    required(campo.nome, { message: 'Informe seu nome.' });
    minLength(campo.nome, 3, { message: 'O nome deve ter pelo menos 3 letras.' });
    required(campo.email, { message: 'Informe seu e-mail.' });
    email(campo.email, { message: 'E-mail inválido.' });
    required(campo.telefone, { message: 'Informe seu telefone.' });
    pattern(campo.telefone, TELEFONE_REGEX, { message: 'Use o formato (11) 91234-5678.' });
  });

  protected enviar(event: Event): void {
    event.preventDefault();
    submit(this.contatoForm, async () => {
      this.enviado.set(this.contato());
      this.contatoForm().reset();
      this.contato.set({ ...CONTATO_VAZIO });
    });
  }
}

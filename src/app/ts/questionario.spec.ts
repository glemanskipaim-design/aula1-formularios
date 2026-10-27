import { TestBed } from '@angular/core/testing';
import { Questionario } from './questionario';

function preencher(el: HTMLElement, id: string, valor: string): void {
  const input = el.querySelector<HTMLInputElement>(`#${id}`)!;
  input.value = valor;
  input.dispatchEvent(new Event('input'));
  input.dispatchEvent(new Event('blur'));
}

describe('Questionario', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Questionario] }).compileComponents();
  });

  it('mostra erros ao enviar vazio', async () => {
    const fixture = TestBed.createComponent(Questionario);
    const el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    el.querySelector('button')!.click();
    await fixture.whenStable();
    expect(el.textContent).toContain('Informe seu nome.');
    expect(el.textContent).toContain('Informe seu e-mail.');
    expect(el.textContent).toContain('Informe seu telefone.');
    expect(el.querySelector('.resultado')).toBeNull();
  });

  it('rejeita e-mail e telefone inválidos', async () => {
    const fixture = TestBed.createComponent(Questionario);
    const el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    preencher(el, 'email', 'nao-e-email');
    preencher(el, 'telefone', '123');
    await fixture.whenStable();
    expect(el.textContent).toContain('E-mail inválido.');
    expect(el.textContent).toContain('Use o formato (11) 91234-5678.');
  });

  it('exibe os dados quando o formulário é válido', async () => {
    const fixture = TestBed.createComponent(Questionario);
    const el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    preencher(el, 'nome', 'Maria Silva');
    preencher(el, 'email', 'maria@exemplo.com');
    preencher(el, 'telefone', '(11) 91234-5678');
    el.querySelector('button')!.click();
    await fixture.whenStable();
    const resultado = el.querySelector('.resultado')!;
    expect(resultado.textContent).toContain('Maria Silva');
    expect(resultado.textContent).toContain('maria@exemplo.com');
    expect(resultado.textContent).toContain('(11) 91234-5678');
    expect(el.querySelector<HTMLInputElement>('#nome')!.value).toBe('');
  });
});

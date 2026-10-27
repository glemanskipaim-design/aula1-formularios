import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideFormulariosApiFake } from './formularios.api.fake';
import { FormulariosService } from './formularios.service';
import { Editor } from './editor';

function digitar(campo: HTMLInputElement, valor: string): void {
  campo.value = valor;
  campo.dispatchEvent(new Event('input'));
}

describe('Editor', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Editor],
      providers: [provideRouter([]), ...provideFormulariosApiFake()],
    }).compileComponents();
  });

  function botao(el: HTMLElement, texto: string): HTMLButtonElement {
    return Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes(texto))!;
  }

  it('mostra os erros e não salva um formulário incompleto', async () => {
    const fixture = TestBed.createComponent(Editor);
    const el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    botao(el, 'Salvar formulário').click();
    await fixture.whenStable();

    expect(el.textContent).toContain('A pergunta 1 está sem título.');
    expect(TestBed.inject(FormulariosService).formularios()).toHaveLength(1);
  });

  it('cria um formulário novo com perguntas e opções', async () => {
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(Editor);
    const el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();

    digitar(el.querySelector<HTMLInputElement>('#titulo-formulario')!, 'Lanche');
    digitar(el.querySelector<HTMLInputElement>('[id^=titulo-]:not(#titulo-formulario)')!, 'Sabor?');
    botao(el, 'Adicionar opção').click();
    await fixture.whenStable();
    digitar(el.querySelectorAll<HTMLInputElement>('.opcoes input')[1], 'Doce');
    botao(el, 'Salvar formulário').click();
    await fixture.whenStable();

    const criado = TestBed.inject(FormulariosService).formularios().find((f) => f.titulo === 'Lanche');
    expect(criado?.perguntas[0]).toMatchObject({ titulo: 'Sabor?', tipo: 'multipla', opcoes: ['Opção 1', 'Doce'] });
    expect(navegar).toHaveBeenCalledWith(['/f', criado?.id]);
  });

  it('carrega um formulário existente para edição', async () => {
    const fixture = TestBed.createComponent(Editor);
    fixture.componentRef.setInput('id', 'exemplo');
    await fixture.whenStable();
    const titulo = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#titulo-formulario')!;
    expect(titulo.value).toBe('Pesquisa de satisfação da aula');
  });
});

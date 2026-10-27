import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideFormulariosApiFake } from './formularios.api.fake';
import { FormulariosService } from './formularios.service';
import { Responder } from './responder';

async function criar(id = 'exemplo') {
  const fixture = TestBed.createComponent(Responder);
  fixture.componentRef.setInput('id', id);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const clicar = async (texto: string) => {
    Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes(texto))!.click();
    await fixture.whenStable();
  };
  const teclar = async (key: string) => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key }));
    await fixture.whenStable();
  };
  return { fixture, el, clicar, teclar };
}

describe('Responder', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Responder],
      providers: [provideRouter([]), ...provideFormulariosApiFake()],
    }).compileComponents();
  });

  it('começa pela tela de boas-vindas e avança com Enter', async () => {
    const { el, teclar } = await criar();
    expect(el.querySelector('h1')?.textContent).toContain('Pesquisa de satisfação da aula');

    await teclar('Enter');
    expect(el.querySelector('h1')?.textContent).toContain('Seu nome');
    expect(el.querySelector('.contador')?.textContent).toContain('1 de 4');
  });

  it('não deixa passar de uma obrigatória sem resposta', async () => {
    const { el, clicar } = await criar();
    await clicar('Começar');
    await clicar('OK');

    expect(el.textContent).toContain('Esta pergunta é obrigatória.');
    expect(el.querySelector('h1')?.textContent).toContain('Seu nome');
  });

  it('responde tudo com teclado e cliques e registra a resposta', async () => {
    const { el, clicar, teclar } = await criar();
    await clicar('Começar');

    const nome = el.querySelector<HTMLInputElement>('input[type=text]')!;
    nome.value = 'Ana';
    nome.dispatchEvent(new Event('input'));
    await teclar('Enter');

    await teclar('b'); // múltipla escolha: B = "Boa"
    expect(el.querySelector('.opcao.marcada')?.textContent).toContain('Boa');
    await teclar('Enter');

    el.querySelector<HTMLInputElement>('input[type=checkbox]')!.click(); // "Angular"
    await teclar('c'); // "HTML e CSS"
    await clicar('OK');

    await clicar('Enviar'); // sugestões é opcional
    expect(el.textContent).toContain('Obrigado!');

    const [resposta] = TestBed.inject(FormulariosService).respostasDe('exemplo');
    expect(resposta.valores).toEqual({
      'exemplo-nome': 'Ana',
      'exemplo-nota': 'Boa',
      'exemplo-temas': ['Angular', 'HTML e CSS'],
    });
  });

  it('volta para a pergunta anterior mantendo o que foi digitado', async () => {
    const { el, clicar, teclar } = await criar();
    await clicar('Começar');
    const nome = el.querySelector<HTMLInputElement>('input[type=text]')!;
    nome.value = 'Ana';
    nome.dispatchEvent(new Event('input'));
    await teclar('Enter');
    await clicar('Pergunta anterior');

    expect(el.querySelector<HTMLInputElement>('input[type=text]')!.value).toBe('Ana');
  });

  it('avisa quando o formulário não existe', async () => {
    const { el } = await criar('nao-existe');
    expect(el.textContent).toContain('Formulário não encontrado');
  });
});

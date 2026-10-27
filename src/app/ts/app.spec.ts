import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding, withRouterConfig } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { App } from './app';
import { routes } from './app.routes';
import { provideFormulariosApiFake } from './formularios.api.fake';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        ...provideFormulariosApiFake(),
        provideRouter(
          routes,
          withComponentInputBinding(),
          withRouterConfig({ paramsInheritanceStrategy: 'always' }),
        ),
      ],
    })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('mostra o painel com a lista lateral e os números gerais', async () => {
    const harness = await RouterTestingHarness.create('/');
    const el = harness.routeNativeElement!.closest('app-painel') as HTMLElement;

    expect(el.querySelector('.lista')?.textContent).toContain('Pesquisa de satisfação da aula');
    expect(el.querySelector('h1')?.textContent).toContain('Visão geral');
  });

  it('abre o formulário com as abas e repassa o id para elas', async () => {
    const harness = await RouterTestingHarness.create('/f/exemplo');
    const painel = document.querySelector('app-painel') as HTMLElement;
    const abas = Array.from(painel.querySelectorAll('.abas a'), (a) => a.textContent?.trim());

    expect(abas[0]).toBe('Visão geral');
    expect(painel.querySelector('app-visao h2')?.textContent).toContain('Últimos 7 dias');

    await harness.navigateByUrl('/f/exemplo/editar');
    const titulo = painel.querySelector<HTMLInputElement>('#titulo-formulario');
    expect(titulo?.value).toBe('Pesquisa de satisfação da aula');
  });
});

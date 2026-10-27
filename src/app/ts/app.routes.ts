import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    // Fora do painel: quem responde vê só o formulário, em tela cheia.
    path: 'responder/:id',
    title: 'Responder formulário',
    loadComponent: () => import('./responder').then((m) => m.Responder),
  },
  {
    path: '',
    loadComponent: () => import('./painel').then((m) => m.Painel),
    children: [
      {
        path: '',
        title: 'Painel',
        loadComponent: () => import('./inicio').then((m) => m.Inicio),
      },
      {
        path: 'novo',
        title: 'Novo formulário',
        loadComponent: () => import('./editor').then((m) => m.Editor),
      },
      {
        path: 'f/:id',
        loadComponent: () => import('./detalhe').then((m) => m.Detalhe),
        children: [
          {
            path: '',
            title: 'Visão geral',
            loadComponent: () => import('./visao').then((m) => m.Visao),
          },
          {
            path: 'editar',
            title: 'Editar formulário',
            loadComponent: () => import('./editor').then((m) => m.Editor),
          },
          {
            path: 'respostas',
            title: 'Respostas',
            loadComponent: () => import('./respostas').then((m) => m.Respostas),
          },
        ],
      },
      {
        path: 'contato',
        title: 'Questionário de contato',
        loadComponent: () => import('./questionario').then((m) => m.Questionario),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];

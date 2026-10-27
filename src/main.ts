import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/ts/app.config';
import { App } from './app/ts/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

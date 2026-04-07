import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import {
  provideTranslateService
} from '@ngx-translate/core';

import {
  provideTranslateHttpLoader
} from '@ngx-translate/http-loader';

import { routes } from './app.routes';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),

    provideHttpClient(
      withInterceptors([jwtInterceptor])
    ),

    provideTranslateService({
      fallbackLang: 'fr',
      loader: provideTranslateHttpLoader({
        prefix: './assets/i18n/',
        suffix: '.json'
      })
    })
  ]
};
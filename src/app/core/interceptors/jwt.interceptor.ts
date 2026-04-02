import { HttpInterceptorFn } from '@angular/common/http';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {

  console.log('JWT INTERCEPTOR ACTIF :', req.url);

  // Ne pas ajouter le JWT aux routes passkey
  if (req.url.includes('/api/passkey')) {
    console.log('Route passkey détectée, pas de token ajouté');
    return next(req);
  }

  const token = localStorage.getItem('token');

  if (token) {
    console.log('TOKEN ENVOYÉ :', token);

    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    return next(cloned);
  }

  return next(req);
};
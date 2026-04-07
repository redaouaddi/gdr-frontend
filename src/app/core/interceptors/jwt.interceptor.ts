import { HttpInterceptorFn } from '@angular/common/http';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  console.log('JWT INTERCEPTOR ACTIF :', req.url);

  // ignorer assets/traductions/fichiers statiques
  if (
    req.url.includes('assets/') ||
    req.url.includes('/assets/') ||
    req.url.endsWith('.json')
  ) {
    return next(req);
  }

  // ignorer auth
  if (
    req.url.includes('/api/auth/signin') ||
    req.url.includes('/api/auth/signup')
  ) {
    return next(req);
  }

  // ignorer passkey
  if (req.url.includes('/api/passkey')) {
    return next(req);
  }

  const token = localStorage.getItem('token');

  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    return next(cloned);
  }

  return next(req);
};
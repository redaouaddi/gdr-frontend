import { HttpInterceptorFn } from '@angular/common/http';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {

  console.log("JWT INTERCEPTOR ACTIF");

  const token = localStorage.getItem('token');

  if (token) {

    console.log("TOKEN ENVOYÉ :", token);

    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    return next(cloned);
  }

  return next(req);
};
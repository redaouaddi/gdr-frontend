import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);

  const userString = localStorage.getItem('user');
  if (!userString) {
    router.navigate(['/login']);
    return false;
  }

  const user = JSON.parse(userString);
  const userRoles: string[] = user.roles || [];
  const expectedRoles: string[] = route.data['roles'] || [];

  const hasAccess = expectedRoles.some(role => userRoles.includes(role));

  if (hasAccess) {
    return true;
  }

  if (userRoles.includes('ROLE_ADMIN')) {
    router.navigate(['/dashboard/admin']);
  } else if (userRoles.includes('ROLE_CLIENT')) {
    router.navigate(['/dashboard/client']);
  } else if (userRoles.includes('ROLE_AGENT')) {
    router.navigate(['/dashboard/agent']);
  } else if (userRoles.includes('ROLE_MANAGER')) {
    router.navigate(['/dashboard/manager']);
  } else if (userRoles.includes('ROLE_SERVICE_MANAGER')) {
    router.navigate(['/dashboard/service-manager']);
  } else {
    router.navigate(['/login']);
  }

  return false;
};
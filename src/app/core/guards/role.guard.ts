import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  const user = authService.getUser();
  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  const userRoles = authService.getNormalizedRoles(user);
  const expectedRoles: string[] = (route.data['roles'] || []).map((role: string) =>
    authService.normalizeRole(role)
  );

  const hasAccess = expectedRoles.some(role => userRoles.includes(role));

  if (hasAccess) {
    return true;
  }

  const primaryRole = authService.getPrimaryRole(user);

  if (primaryRole === 'ADMIN') {
    router.navigate(['/dashboard/admin']);
  } else if (primaryRole === 'CONSULTER_RAPPORTS') {
    router.navigate(['/admin/reclamations']);
  } else if (primaryRole === 'CLIENT' || primaryRole === 'USER') {
    router.navigate(['/dashboard/client']);
  } else if (primaryRole === 'AGENT') {
    router.navigate(['/agent/missions']);
  } else if (primaryRole === 'MANAGER') {
    router.navigate(['/dashboard/manager']);
  } else if (primaryRole === 'SERVICE_MANAGER') {
    router.navigate(['/dashboard/service-manager']);
  } else {
    router.navigate(['/login']);
  }

  return false;
};

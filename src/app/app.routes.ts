import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { UserListComponent } from './features/users/user-list/user-list.component';
import { DashboardAdminComponent } from './layout/dashboard-admin/dashboard-admin';
import { DashboardClientComponent } from './layout/dashboard-client/dashboard-client';
import { authGuard } from './core/guards/auth.guard';
import { UserCreateComponent } from './features/users/user-create/user-create';
import { roleGuard } from './core/guards/role.guard';
import { UserEdit } from './features/users/user-edit/user-edit';
import { Roles } from './features/admin/roles/roles';
import { Settings } from './features/admin/settings/settings';
import { ReclamationCreateComponent } from './features/reclamations/reclamation-create/reclamation-create.component';
import { LandingPageComponent } from './features/public/landing-page/landing-page';

export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'login', component: LoginComponent },

  {
    path: 'dashboard/admin',
    component: DashboardAdminComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN'] }
  },

  {
    path: 'dashboard/client',
    component: DashboardClientComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_CLIENT'] }
  },

  {
    path: 'admin/users',
    component: UserListComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN'] }
  },

  {
  path: 'admin/users/create',
  component: UserCreateComponent,
  canActivate: [authGuard, roleGuard],
  data: { roles: ['ROLE_ADMIN'] }
  },

  {
    path: 'admin/users/edit/:id',
    component: UserEdit,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN'] }
  },

  {
    path: 'admin/roles',
    component: Roles,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN'] }
  },

  {
    path: 'admin/settings',
    component: Settings,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN'] }
  },

  {
    path: 'mes-reclamations',
    redirectTo: 'dashboard/client',
    pathMatch: 'full'
  },

  {
    path: 'mes-reclamations/nouvelle',
    component: ReclamationCreateComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_CLIENT'] }
  }

];
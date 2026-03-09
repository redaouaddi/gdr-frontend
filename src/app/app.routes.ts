import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { UserListComponent } from './features/users/user-list/user-list.component';
import { DashboardAdminComponent } from './layout/dashboard-admin/dashboard-admin';
import { authGuard } from './core/guards/auth.guard';
import { UserCreateComponent } from './features/users/user-create/user-create';
import { roleGuard } from './core/guards/role.guard';


export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },

  {
    path: 'dashboard/admin',
    component: DashboardAdminComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN'] }
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
  }
  
];
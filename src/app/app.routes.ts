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
import { TeamCreateComponent } from './features/teams/team-create/team-create.component';
import { TeamListComponent } from './features/teams/team-list/team-list.component';
import { TeamEditComponent } from './features/teams/team-edit/team-edit.component';
import { MyTeamComponent } from './features/teams/my-team/my-team.component';
import { ServiceManagerDashboardComponent } from './features/service-manager/dashboard/service-manager-dashboard.component';
import { AllReclamationsComponent } from './features/admin/all-reclamations/all-reclamations.component';

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
    path: 'admin/reclamations',
    component: AllReclamationsComponent,
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
    path: 'admin/teams',
    component: TeamListComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN'] }
  },

  {
    path: 'admin/teams/create',
    component: TeamCreateComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN'] }
  },

  {
    path: 'admin/teams/edit/:id',
    component: TeamEditComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN'] }
  },

  {
    path: 'service-manager/my-team',
    component: MyTeamComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_CHEF_EQUIPE', 'ROLE_AGENT'] }
  },

  {
    path: 'dashboard/service-manager',
    component: ServiceManagerDashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_SERVICE_MANAGER'] }
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
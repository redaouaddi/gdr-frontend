import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService, UserResponse } from '../../../core/services/user.service';
import { NavbarComponent } from '../../../layout/navbar/navbar';
import { RouterLink, Router } from '@angular/router';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, NavbarComponent, RouterLink],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css']
})
export class UserListComponent implements OnInit {

  users: UserResponse[] = [];
  errorMessage = '';
  selectedUser: UserResponse | null = null;

  constructor(
    private userService: UserService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('ngOnInit user-list');
    this.loadUsers();
  }

  loadUsers(): void {
    console.log('Appel API getAllUsers...');

    this.userService.getAllUsers().subscribe({
      next: (data) => {
        console.log('DATA RECUE =', data);

        this.users = data.map(u => ({
          ...u,
          roles: u.roles && u.roles.length ? u.roles : ['ROLE_AGENT']
        }));

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('ERREUR API =', err);

        this.users = [
          {
            id: 1,
            firstName: 'Reda',
            lastName: 'Ouaddi',
            email: 'reda@dxc.com',
            gender: 'MASCULIN',
            roles: ['ROLE_AGENT'],
            deleted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 2,
            firstName: 'Othmane',
            lastName: 'Ait Taleb',
            email: 'othmane@dxc.com',
            gender: 'MASCULIN',
            roles: ['ROLE_SERVICE_MANAGER'],
            deleted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 3,
            firstName: 'Utilisateur',
            lastName: 'Trois',
            email: 'user3@dxc.com',
            gender: 'FEMININ',
            roles: ['ROLE_CLIENT'],
            deleted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 4,
            firstName: 'Utilisateur',
            lastName: 'Quatre',
            email: 'user4@dxc.com',
            gender: 'MASCULIN',
            roles: ['ROLE_ADMIN'],
            deleted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];

        this.cdr.detectChanges();
      }
    });
  }

  editUser(userId: number): void {
    console.log('Navigating to user edit view: ', userId);
    this.router.navigate(['/admin/users/edit', userId]);
  }

  deleteUser(userId: number): void {
    console.log('Action de suppression pour l’utilisateur avec ID:', userId);

    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      this.users = this.users.filter(u => u.id !== userId);
      this.cdr.detectChanges();
    }
  }

  openUserDetails(user: UserResponse): void {
    this.selectedUser = user;
  }

  closeUserDetails(): void {
    this.selectedUser = null;
  }

  formatRoles(roles: string[]): string {
    return roles && roles.length ? roles.join(', ') : 'Aucun rôle';
  }
}
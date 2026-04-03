import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService, UserResponse } from '../../../core/services/user.service';
import { NavbarComponent } from '../../../layout/navbar/navbar';
import { RouterLink, Router } from '@angular/router';
import { SidebarComponent } from '../../../layout/sidebar/sidebar';
@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, NavbarComponent, RouterLink, SidebarComponent],
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
        this.users = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('ERREUR API =', err);
        // Mock fallback deleted for clarity in rollback
        this.users = [];
        this.cdr.detectChanges();
      }
    });
  }

  editUser(userId: number): void {
    this.router.navigate(['/admin/users/edit', userId]);
  }

  deleteUser(userId: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      this.userService.deleteUser(userId).subscribe({
        next: () => this.loadUsers(),
        error: (err: any) => {
          this.errorMessage = 'Erreur lors de la suppression de l’utilisteur';
          this.cdr.detectChanges();
        }
      });
    }
  }

  openUserDetails(user: UserResponse): void {
    this.selectedUser = user;
  }

  closeUserDetails(): void {
    this.selectedUser = null;
  }
}
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService, UserResponse } from '../../../core/services/user.service';
import { Navbar } from '../../../layout/navbar/navbar';
import { RouterLink, Router } from '@angular/router';
import { Sidebar } from '../../../layout/sidebar/sidebar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, Navbar, RouterLink, Sidebar, TranslateModule],
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
    private router: Router,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.userService.getAllUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('ERREUR API =', err);
        this.users = [];
        this.errorMessage = this.translate.instant('user_list.errors.load_failed');
        this.cdr.detectChanges();
      }
    });
  }

  editUser(userId: number): void {
    this.router.navigate(['/admin/users/edit', userId]);
  }

  deleteUser(userId: number): void {
    if (confirm(this.translate.instant('user_list.confirm_delete'))) {
      this.userService.deleteUser(userId).subscribe({
        next: () => this.loadUsers(),
        error: () => {
          this.errorMessage = this.translate.instant('user_list.errors.delete_failed');
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

  translateUserStatus(deleted?: boolean): string {
    return deleted
      ? this.translate.instant('user_list.status.deleted')
      : this.translate.instant('user_list.status.active');
  }

  translateGender(gender?: string): string {
    if (!gender) return '-';
    return this.translate.instant('user_list.gender.' + gender);
  }
}
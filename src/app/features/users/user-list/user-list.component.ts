import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService, UserResponse } from '../../../core/services/user.service';
import { Navbar } from '../../../layout/navbar/navbar';
import { RouterLink, Router } from '@angular/router';
import { Sidebar } from '../../../layout/sidebar/sidebar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { AccessService } from '../../../core/services/access.service';
import { Access } from '../../../core/models/access.model';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, Navbar, RouterLink, Sidebar, TranslateModule, FormsModule],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css']
})
export class UserListComponent implements OnInit {

  users: UserResponse[] = [];
  errorMessage = '';
  selectedUser: UserResponse | null = null;

  // Search & Filters
  allUsers: UserResponse[] = [];
  filteredUsers: UserResponse[] = [];
  searchTerm = '';
  selectedRole = '';
  selectedStatus = '';
  roles: Access[] = [];

  // Pagination
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  constructor(
    private userService: UserService,
    private accessService: AccessService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadRoles();
    this.loadUsers();
  }

  loadRoles(): void {
    this.accessService.getAll(0, 1000).subscribe({
      next: (response) => {
        this.roles = (response.content || []).filter((r: Access) => !r.deleted);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading roles', err)
    });
  }

  loadUsers(): void {
    this.userService.getAllUsers(0, 1000).subscribe({
      next: (response) => {
        this.allUsers = response.content || [];
        this.applyFilters();
      },
      error: (err) => {
        console.error('ERREUR API =', err);
        this.allUsers = [];
        this.filteredUsers = [];
        this.users = [];
        this.errorMessage = this.translate.instant('user_list.errors.load_failed');
        this.cdr.detectChanges();
      }
    });
  }

  applyFilters(): void {
    this.filteredUsers = this.allUsers.filter(user => {
      const matchesSearch = !this.searchTerm || 
        (user.firstName && user.firstName.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        (user.lastName && user.lastName.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        (user.email && user.email.toLowerCase().includes(this.searchTerm.toLowerCase()));

      const matchesRole = !this.selectedRole || 
        (user.roles && user.roles.includes(this.selectedRole));

      const matchesStatus = !this.selectedStatus || 
        (this.selectedStatus === 'DELETED' && user.deleted) ||
        (this.selectedStatus === 'ACTIVE' && !user.deleted);

      return matchesSearch && matchesRole && matchesStatus;
    });

    this.totalElements = this.filteredUsers.length;
    this.totalPages = Math.ceil(this.totalElements / this.pageSize);

    if (this.currentPage >= this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages - 1;
    }

    this.updatePaginatedUsers();
  }

  updatePaginatedUsers(): void {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + Number(this.pageSize);
    this.users = this.filteredUsers.slice(startIndex, endIndex);
    this.cdr.detectChanges();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePaginatedUsers();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.updatePaginatedUsers();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.updatePaginatedUsers();
    }
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
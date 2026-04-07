import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Access, EPermission } from '../../../core/models/access.model';
import { AccessService } from '../../../core/services/access.service';
import { NavbarComponent } from '../../../layout/navbar/navbar';
import { SidebarComponent } from '../../../layout/sidebar/sidebar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, SidebarComponent, TranslateModule],
  templateUrl: './roles.html',
  styleUrls: ['./roles.css'],
})
export class Roles implements OnInit {
  roles: Access[] = [];
  allPermissions = Object.values(EPermission);
  selectedRole: Access | null = null;
  showCreateForm = false;
  isSubmitting = false;

  newRole: Access = {
    name: '',
    permissions: []
  };

  constructor(
    private accessService: AccessService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.accessService.getAll().subscribe({
      next: (data) => {
        this.roles = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('ERREUR API ROLES =', err);
      }
    });
  }

  selectRole(role: Access): void {
    this.selectedRole = role;
    this.showCreateForm = false;
    this.cdr.detectChanges();
  }

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    if (this.showCreateForm) {
      this.selectedRole = null;
      this.resetNewRole();
    }
    this.cdr.detectChanges();
  }

  resetNewRole(): void {
    this.newRole = {
      name: '',
      permissions: []
    };
  }

  onPermissionChange(permission: EPermission, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      if (!this.newRole.permissions.includes(permission)) {
        this.newRole.permissions.push(permission);
      }
    } else {
      this.newRole.permissions = this.newRole.permissions.filter(p => p !== permission);
    }
  }

  createRole(): void {
    if (!this.newRole.name || this.newRole.permissions.length === 0) return;

    this.isSubmitting = true;
    this.accessService.create(this.newRole).subscribe({
      next: (createdRole) => {
        this.roles.push(createdRole);
        this.showCreateForm = false;
        this.isSubmitting = false;
        this.resetNewRole();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error creating role', err);
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  deleteRole(roleId: number): void {
    if (confirm(this.translate.instant('roles.confirm_delete'))) {
      this.accessService.delete(roleId).subscribe({
        next: () => {
          this.loadRoles();
          this.selectedRole = null;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Erreur lors de la suppression du rôle', err);
          this.cdr.detectChanges();
        }
      });
    }
  }

  translatePermission(permission: string): string {
    return this.translate.instant('permissions.' + permission);
  }

  translateRoleStatus(deleted?: boolean): string {
    return deleted
      ? this.translate.instant('roles.deleted')
      : this.translate.instant('roles.active');
  }
}
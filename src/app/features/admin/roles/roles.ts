import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Access, EPermission } from '../../../core/models/access.model';
import { AccessService } from '../../../core/services/access.service';
import { NavbarComponent } from '../../../layout/navbar/navbar';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
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
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('ngOnInit Roles');
    this.loadRoles();
  }

  loadRoles(): void {
    console.log('Appel API getAll (AccessService)...');
    this.accessService.getAll().subscribe({
      next: (data) => {
        console.log('ROLES RECUS =', data);
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
        console.log('ROLE CREE =', createdRole);
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
    if (confirm('Êtes-vous sûr de vouloir supprimer ce rôle ?')) {
      this.accessService.delete(roleId).subscribe({
        next: () => {
          console.log('Rôle supprimé (soft delete)');
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
}

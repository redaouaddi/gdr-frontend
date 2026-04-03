import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../../layout/navbar/navbar';
import { SidebarComponent } from '../../../layout/sidebar/sidebar';
import { UserService } from '../../../core/services/user.service';
import { AccessService } from '../../../core/services/access.service';
import { Access } from '../../../core/models/access.model';

@Component({
  selector: 'app-user-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavbarComponent, RouterLink, SidebarComponent],
  templateUrl: './user-edit.html'
})
export class UserEdit implements OnInit {

  userForm!: FormGroup;
  userId!: number;
  errorMessage = '';
  successMessage = '';
  roles: Access[] = [];
  selectedRoles: string[] = [];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private accessService: AccessService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.userId = Number(this.route.snapshot.paramMap.get('id'));

    this.userForm = this.fb.group({
      firstName: [{ value: '', disabled: false }, Validators.required],
      lastName: [{ value: '', disabled: false }, Validators.required],
      email: [{ value: '', disabled: false }, [Validators.required, Validators.email]],
      gender: ['', Validators.required]
    });

    if (this.userId) {
      this.loadUser();
    }
    this.loadRoles();
  }

  loadRoles(): void {
    this.accessService.getAll().subscribe({
      next: (data) => {
        this.roles = data.filter(r => !r.deleted);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading roles', err)
    });
  }

  loadUser(): void {
    this.userService.getUserById(this.userId).subscribe({
      next: (user) => {
        this.userForm.patchValue({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          gender: user.gender
        });
        this.selectedRoles = user.roles || [];

        console.log('Form patched, selected roles:', this.selectedRoles);
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les informations de l’utilisateur.';
        this.cdr.detectChanges();
      }
    });
  }

  onRoleToggle(roleName: string): void {
    if (this.selectedRoles.includes(roleName)) {
      this.selectedRoles = this.selectedRoles.filter(r => r !== roleName);
    } else {
      this.selectedRoles.push(roleName);
    }
  }

  isRoleSelected(roleName: string): boolean {
    return this.selectedRoles.includes(roleName);
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      return;
    }

    const formValue = this.userForm.getRawValue();

    this.userService.updateUser(this.userId, {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
      gender: formValue.gender,
      roles: this.selectedRoles
    }).subscribe({
      next: () => {
        this.successMessage = 'Utilisateur mis à jour avec succès';
        setTimeout(() => {
          this.router.navigate(['/admin/users']);
        }, 1000);
      },
      error: () => {
        this.errorMessage = 'Erreur lors de la mise à jour de l’utilisateur';
        this.cdr.detectChanges();
      }
    });
  }
}
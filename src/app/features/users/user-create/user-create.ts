import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../../layout/navbar/navbar';
import { UserService } from '../../../core/services/user.service';
import { AccessService } from '../../../core/services/access.service';
import { Access } from '../../../core/models/access.model';

@Component({
  selector: 'app-user-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, NavbarComponent],
  templateUrl: './user-create.html',
  styleUrls: ['./user-create.css']
})
export class UserCreateComponent implements OnInit {

  userForm!: FormGroup;
  errorMessage = '';
  successMessage = '';
  roles: Access[] = [];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private accessService: AccessService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      gender: ['', Validators.required],
      role: ['', Validators.required]
    });
    this.loadRoles();
  }

  loadRoles(): void {
    this.accessService.getAll().subscribe({
      next: (data) => {
        this.roles = data.filter(r => !r.deleted);
        if (this.roles.length > 0 && !this.userForm.value.role) {
          this.userForm.patchValue({ role: this.roles[0].name });
        }
      },
      error: (err) => console.error('Error loading roles', err)
    });
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const formValue = this.userForm.value;

    this.userService.createUser({
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
      password: formValue.password,
      gender: formValue.gender,
      roles: [formValue.role]
    }).subscribe({
      next: () => {
        this.successMessage = 'Utilisateur créé avec succès';
        this.errorMessage = '';

        setTimeout(() => {
          this.router.navigate(['/admin/users']);
        }, 1000);
      },
      error: (err) => {
  console.error('ERREUR CREATE USER =', err);
  this.errorMessage = err.error?.message || 'Erreur lors de la création de l’utilisateur';
}
    });
  }
}
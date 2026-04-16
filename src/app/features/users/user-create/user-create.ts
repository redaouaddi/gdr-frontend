import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Navbar } from '../../../layout/navbar/navbar';
import { UserService } from '../../../core/services/user.service';
import { Sidebar } from '../../../layout/sidebar/sidebar';
import { AccessService } from '../../../core/services/access.service';
import { Access } from '../../../core/models/access.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-user-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, Navbar, Sidebar, TranslateModule],
  templateUrl: './user-create.html',
  styleUrls: ['./user-create.css']
})
export class UserCreateComponent implements OnInit {

  userForm!: FormGroup;
  errorMessage = '';
  successMessage = '';
  roles: Access[] = [];
  selectedRoles: string[] = [];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private accessService: AccessService,
    private router: Router,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.userForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      gender: ['', Validators.required]
    });
    this.loadRoles();
  }

  loadRoles(): void {
    this.accessService.getAll().subscribe({
      next: (data) => {
        this.roles = data.filter(r => !r.deleted);
        if (this.roles.length > 0) {
          this.selectedRoles = [this.roles[0].name];
        }
      },
      error: (err) => console.error('Error loading roles', err)
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

  translateGender(gender: string): string {
    return this.translate.instant('user_create.gender_options.' + gender);
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
      roles: this.selectedRoles
    }).subscribe({
      next: () => {
        this.successMessage = this.translate.instant('user_create.messages.success');
        this.errorMessage = '';

        setTimeout(() => {
          this.router.navigate(['/admin/users']);
        }, 1000);
      },
      error: (err) => {
        console.error('ERREUR CREATE USER =', err);
        this.errorMessage =
          err.error?.message || this.translate.instant('user_create.errors.create_failed');
      }
    });
  }
}
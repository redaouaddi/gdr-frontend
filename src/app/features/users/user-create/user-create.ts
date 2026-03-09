import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { SidebarComponent } from '../../../layout/sidebar/sidebar';
import { NavbarComponent } from '../../../layout/navbar/navbar';
import { UserService } from '../../../core/services/user.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-user-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent, NavbarComponent, RouterLink],
  templateUrl: './user-create.html'
})
export class UserCreateComponent implements OnInit {

  userForm!: FormGroup;

  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {

    this.userForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      role: ['ROLE_AGENT', Validators.required]
    });

  }

  onSubmit(): void {

    if (this.userForm.invalid) {
      return;
    }

    const formValue = this.userForm.value;

    this.userService.createUser({
      username: formValue.username,
      email: formValue.email,
      password: formValue.password,
      roles: [formValue.role]
    }).subscribe({
      next: () => {
        this.successMessage = 'Utilisateur créé avec succès';
        setTimeout(() => {
          this.router.navigate(['/admin/users']);
        }, 1000);
      },
      error: () => {
        this.errorMessage = 'Erreur lors de la création de l’utilisateur';
      }
    });

  }
}
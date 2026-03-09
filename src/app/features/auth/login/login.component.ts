import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {

  errorMessage = '';
  successMessage = '';

  loginForm: FormGroup;

  constructor(
  private fb: FormBuilder,
  private authService: AuthService,
  private router: Router
) {
  this.loginForm = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });
}

  onSubmit(): void {

    if (this.loginForm.invalid) {
      return;
    }

    const formValue = this.loginForm.value;

    this.authService.login({
      username: formValue.username!,
      password: formValue.password!
    }).subscribe({
    
     next: (response) => {
  this.authService.saveToken(response.token);
  this.authService.saveUser(response);
  this.successMessage = 'Connexion réussie';
  this.errorMessage = '';

  const roles = response.roles || [];

          if (roles.includes('ROLE_ADMIN')) {
            this.router.navigate(['/dashboard/admin']);
          } else if (roles.includes('ROLE_CLIENT')) {
            this.router.navigate(['/dashboard/client']);
          } else if (roles.includes('ROLE_AGENT')) {
            this.router.navigate(['/dashboard/agent']);
          } else if (roles.includes('ROLE_MANAGER')) {
            this.router.navigate(['/dashboard/manager']);
          } else if (roles.includes('ROLE_SERVICE_MANAGER')) {
            this.router.navigate(['/dashboard/service-manager']);
          } else {
            this.router.navigate(['/login']);
          }
},
      error: () => {

        this.errorMessage = 'Nom d’utilisateur ou mot de passe incorrect';
        this.successMessage = '';

      }
    });

  }

}
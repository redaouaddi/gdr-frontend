import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { AuthService, LoginRequest } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent implements OnInit {

  loginForm!: FormGroup;
  isLoading = false;
  loginError = '';

  currentLang = 'fr';

  constructor(
    private fb: FormBuilder,
    private translate: TranslateService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {

    this.loginForm = this.fb.group({
      email: ['', Validators.required],
      password: ['', Validators.required]
    });

    const savedLang = localStorage.getItem('lang') || 'fr';
    this.currentLang = savedLang;
    this.translate.use(savedLang);
  }

  switchLang(lang: string) {
    this.currentLang = lang;
    this.translate.use(lang);
    localStorage.setItem('lang', lang);
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginError = 'Veuillez remplir tous les champs correctement';
      return;
    }

    this.isLoading = true;
    this.loginError = '';

    const loginData: LoginRequest = {
      email: this.loginForm.value.email!,
      password: this.loginForm.value.password!
    };

    this.authService.login(loginData).subscribe({
      next: (response) => {
        this.authService.saveToken(response.token);
        this.authService.saveUser(response);
        
        // Redirection selon le rôle
        if (response.roles.includes('ROLE_ADMIN')) {
          this.router.navigate(['/dashboard/admin']);
        } else if (response.roles.includes('ROLE_CLIENT')) {
          this.router.navigate(['/dashboard/client']);
        } else if (response.roles.includes('ROLE_SERVICE_MANAGER')) {
          this.router.navigate(['/dashboard/service-manager']);
        } else {
          this.router.navigate(['/dashboard/client']);
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.loginError = error.error?.message || 'Erreur de connexion. Veuillez vérifier vos identifiants.';
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  openFaceLoginModal() {
    // TODO: Implémenter la connexion par reconnaissance faciale
    console.log('Face login modal - à implémenter');
    // Pour l'instant, on peut afficher un message ou rediriger vers une page de configuration
    this.loginError = 'La connexion par reconnaissance faciale sera bientôt disponible.';
  }

}
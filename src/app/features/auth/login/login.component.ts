import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  loginForm: FormGroup;

  loginError = '';
  isLoading = false;

  showFaceLoginModal = false;
  faceLoginImage: string | null = null;
  faceLoginMessage = '';
  faceLoginError = '';
  faceLoginStream: MediaStream | null = null;

  @ViewChild('faceLoginVideo') faceLoginVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('faceLoginCanvas') faceLoginCanvas!: ElementRef<HTMLCanvasElement>;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

onSubmit(): void {
  this.loginError = '';

  if (this.loginForm.invalid || this.isLoading) {
    this.loginForm.markAllAsTouched();
    return;
  }

  const email = this.loginForm.value.email?.trim();
  const password = this.loginForm.value.password;

  this.isLoading = true;

  this.authService.login({
    email: email,
    password: password
  }).subscribe({
    next: (response: any) => {
      console.log('Réponse login :', response);
      console.log('Roles :', response.roles);

      this.authService.saveToken(response.token);
      this.authService.saveUser(response);

      this.isLoading = false;

      if (response.roles?.includes('ROLE_ADMIN')) {
        console.log('REDIRECTION ADMIN');
        this.router.navigateByUrl('/dashboard/admin');
      } else if (
        response.roles?.includes('ROLE_CLIENT') ||
        response.roles?.includes('ROLE_USER')
      ) {
        console.log('REDIRECTION CLIENT');
        this.router.navigateByUrl('/dashboard/client');
      } else {
        console.log('REDIRECTION PAR DÉFAUT');
        this.router.navigateByUrl('/dashboard/client');
      }
      
    },
    error: (error) => {
        console.error('Erreur login :', error);

        if (error.status === 401) {
          this.loginError = '❌ Email ou mot de passe incorrect';
        } else {
          this.loginError = '⚠️ Une erreur est survenue. Réessayez.';
        }

        this.isLoading = false;
      }
      
  });
  
}

  openFaceLoginModal(): void {
    this.faceLoginMessage = '';
    this.faceLoginError = '';
    this.faceLoginImage = null;
    this.showFaceLoginModal = true;
  }

  closeFaceLoginModal(): void {
    this.showFaceLoginModal = false;
    this.stopFaceLoginCamera();
    this.faceLoginImage = null;
  }

  async startFaceLoginCamera(): Promise<void> {
    this.faceLoginError = '';
    this.faceLoginMessage = '';

    try {
      this.faceLoginStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });

      if (this.faceLoginVideo?.nativeElement) {
        this.faceLoginVideo.nativeElement.srcObject = this.faceLoginStream;
      }
    } catch (error:any) {
      console.error(error);
      this.faceLoginError = 'Impossible d’accéder à la caméra.';
        console.error('ERREUR LOGIN FACE :', error);

        if (error.status === 401) {
          this.faceLoginError = '❌ Visage non reconnu';
        } else if (error.status === 400) {
          this.faceLoginError = '⚠️ Aucune image valide';
        } else {
          this.faceLoginError = '⚠️ Erreur système. Réessayez.';
        }
    }
  }

  captureFaceLogin(): void {
    this.faceLoginError = '';
    this.faceLoginMessage = '';

    const video = this.faceLoginVideo?.nativeElement;
    const canvas = this.faceLoginCanvas?.nativeElement;

    if (!video || !canvas) {
      this.faceLoginError = 'Éléments vidéo/canvas introuvables.';
      return;
    }

    if (!this.faceLoginStream) {
      this.faceLoginError = 'Veuillez ouvrir la caméra d’abord.';
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) {
      this.faceLoginError = 'Vidéo non prête. Réessayez dans 1 seconde.';
      return;
    }

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      this.faceLoginError = 'Impossible de capturer l’image.';
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    this.faceLoginImage = canvas.toDataURL('image/png');
    this.faceLoginMessage = 'Photo capturée avec succès.';
  }

  stopFaceLoginCamera(): void {
    if (this.faceLoginStream) {
      this.faceLoginStream.getTracks().forEach(track => track.stop());
      this.faceLoginStream = null;
    }
  }

  async loginWithFace(): Promise<void> {
  this.faceLoginError = '';
  this.faceLoginMessage = '';

  const email = this.loginForm.get('email')?.value?.trim();

  console.log('LOGIN FACE CLICK');
  console.log('EMAIL :', email);
  console.log('IMAGE ?', !!this.faceLoginImage);

  if (!email) {
    this.faceLoginError = 'Veuillez saisir votre email.';
    return;
  }

  if (!this.faceLoginImage) {
    this.faceLoginError = 'Veuillez capturer une image.';
    return;
  }

  try {
    const response: any = await firstValueFrom(
      this.http.post('http://localhost:8080/api/face/login', {
        email: email,
        image: this.faceLoginImage
      })
    );

    console.log('REPONSE LOGIN FACE :', response);

    this.authService.saveToken(response.token);
    this.authService.saveUser(response);

    this.faceLoginMessage = 'Connexion par visage réussie.';

    this.closeFaceLoginModal();

    if (response.roles?.includes('ROLE_ADMIN')) {
      console.log('REDIRECTION FACE ADMIN');
      await this.router.navigateByUrl('/dashboard/admin');
    } else if (
      response.roles?.includes('ROLE_CLIENT') ||
      response.roles?.includes('ROLE_USER')
    ) {
      console.log('REDIRECTION FACE CLIENT');
      await this.router.navigateByUrl('/dashboard/client');
    } else {
      console.log('REDIRECTION FACE PAR DEFAUT');
      await this.router.navigateByUrl('/dashboard/client');
    }

  } catch (error: any) {
    console.error('ERREUR LOGIN FACE :', error);
    this.faceLoginError =
      error?.error?.message ||
      'Visage non reconnu ou erreur lors de la connexion.';
  }
}
}
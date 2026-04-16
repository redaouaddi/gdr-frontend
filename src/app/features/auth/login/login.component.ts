import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;

  loginError = '';
  isLoading = false;
  currentLang = 'fr';

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
    private authService: AuthService,
    private translate: TranslateService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    const savedLang = localStorage.getItem('lang') || 'fr';
    this.currentLang = savedLang;
    this.translate.use(savedLang);
  }

  switchLang(lang: string): void {
    this.currentLang = lang;
    this.translate.use(lang);
    localStorage.setItem('lang', lang);
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
      email,
      password
    }).subscribe({
      next: (response: any) => {
        this.authService.saveToken(response.token);
        this.authService.saveUser(response);

        this.isLoading = false;

        const roles = response.roles || [];
        if (roles.includes('ADMIN')) {
          this.router.navigateByUrl('/dashboard/admin');
        } else if (roles.includes('SERVICE_MANAGER')) {
          this.router.navigateByUrl('/dashboard/service-manager');
        } else if (roles.includes('CHEF_EQUIPE')) {
          this.router.navigateByUrl('/service-manager/my-team');
        } else if (roles.includes('AGENT')) {
          this.router.navigateByUrl('/agent/missions');
        } else if (roles.includes('CLIENT') || roles.includes('USER')) {
          this.router.navigateByUrl('/dashboard/client');
        } else {
          this.router.navigateByUrl('/dashboard/client');
        }
      },
      error: (error: any) => {
        console.error('Erreur login :', error);

        if (error.status === 401) {
          this.loginError = this.translate.instant('login.errors.invalid_credentials');
        } else {
          this.loginError = this.translate.instant('login.errors.generic');
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
    } catch (error: any) {
      console.error(error);
      this.faceLoginError = this.translate.instant('login.face_errors.camera_access');
    }
  }

  captureFaceLogin(): void {
    this.faceLoginError = '';
    this.faceLoginMessage = '';

    const video = this.faceLoginVideo?.nativeElement;
    const canvas = this.faceLoginCanvas?.nativeElement;

    if (!video || !canvas) {
      this.faceLoginError = this.translate.instant('login.face_errors.video_canvas_missing');
      return;
    }

    if (!this.faceLoginStream) {
      this.faceLoginError = this.translate.instant('login.face_errors.open_camera_first');
      return;
    }

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    if (!videoWidth || !videoHeight) {
      this.faceLoginError = this.translate.instant('login.face_errors.video_not_ready');
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      this.faceLoginError = this.translate.instant('login.face_errors.capture_failed');
      return;
    }

    // Capture centrée pour mieux isoler le visage et réduire l'arrière-plan
    const cropWidth = videoWidth * 0.45;
    const cropHeight = videoHeight * 0.7;
    const sx = (videoWidth - cropWidth) / 2;
    const sy = (videoHeight - cropHeight) / 2;

    canvas.width = cropWidth;
    canvas.height = cropHeight;

    context.drawImage(
      video,
      sx,
      sy,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    this.faceLoginImage = canvas.toDataURL('image/jpeg', 0.95);
    this.faceLoginMessage = this.translate.instant('login.face_messages.photo_captured');
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

    if (!email) {
      this.faceLoginError = this.translate.instant('login.face_errors.email_required');
      return;
    }

    if (!this.faceLoginImage) {
      this.faceLoginError = this.translate.instant('login.face_errors.image_required');
      return;
    }

    try {
      const response: any = await firstValueFrom(
        this.http.post('http://localhost:8080/api/face/login', {
          email,
          image: this.faceLoginImage
        })
      );

      this.authService.saveToken(response.token);
      this.authService.saveUser(response);

      this.faceLoginMessage = this.translate.instant('login.face_messages.login_success');
      this.closeFaceLoginModal();

      const roles = response.roles || [];
      if (roles.includes('ROLE_ADMIN')) {
        await this.router.navigateByUrl('/dashboard/admin');
      } else if (roles.includes('ROLE_SERVICE_MANAGER')) {
        await this.router.navigateByUrl('/dashboard/service-manager');
      } else if (roles.includes('ROLE_CHEF_EQUIPE') || roles.includes('ROLE_AGENT')) {
        await this.router.navigateByUrl('/service-manager/my-team');
      } else if (roles.includes('ROLE_CLIENT') || roles.includes('ROLE_USER')) {
        await this.router.navigateByUrl('/dashboard/client');
      } else {
        await this.router.navigateByUrl('/dashboard/client');
      }
    } catch (error: any) {
      console.error('ERREUR LOGIN FACE :', error);

      if (error.status === 401) {
        this.faceLoginError = this.translate.instant('login.face_errors.not_recognized');
      } else {
        this.faceLoginError = this.translate.instant('login.face_errors.login_failed');
      }
    }
  }
}
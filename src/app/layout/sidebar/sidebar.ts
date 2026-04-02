import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { PasskeyService } from '../../core/services/passkey.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css'],
  standalone: true
})
export class SidebarComponent implements OnInit {
  isAdmin = false;
  isClient = false;

  usersMenuOpen = false;
  reclamationsMenuOpen = false;

  isRegisteringPasskey = false;
  passkeyMessage = '';
  passkeyError = '';

  showFaceModal = false;
  capturedImage: string | null = null;
  faceCaptureMessage = '';
  faceCaptureError = '';
  mediaStream: MediaStream | null = null;

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  constructor(
    private authService: AuthService,
    private passkeyService: PasskeyService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    const user = this.authService.getUser();
    if (user && user.roles) {
      this.isAdmin = user.roles.includes('ROLE_ADMIN');
      this.isClient = user.roles.includes('ROLE_CLIENT') || user.roles.includes('ROLE_USER');
    }
  }

  toggleUsersMenu() {
    this.usersMenuOpen = !this.usersMenuOpen;
  }

  toggleReclamationsMenu() {
    this.reclamationsMenuOpen = !this.reclamationsMenuOpen;
  }

  async activateFaceId() {
    this.passkeyMessage = '';
    this.passkeyError = '';

    const user = this.authService.getUser();
    const email = user?.email;

    if (!email) {
      this.passkeyError = 'Utilisateur non identifié.';
      return;
    }

    this.isRegisteringPasskey = true;

    try {
      const result: any = await this.passkeyService.startRegistration(email);
      this.passkeyMessage = result?.message || 'Face ID activé avec succès.';
    } catch (error: any) {
      console.error(error);
      this.passkeyError =
        error?.error?.message ||
        error?.message ||
        'Erreur lors de l’activation de Face ID.';
    } finally {
      this.isRegisteringPasskey = false;
    }
  }

  openFaceModal() {
    this.showFaceModal = true;
    this.capturedImage = null;
    this.faceCaptureMessage = '';
    this.faceCaptureError = '';
  }

  closeFaceModal() {
    this.showFaceModal = false;
    this.stopCamera();
    this.capturedImage = null;
  }

  async startCamera() {
    this.faceCaptureError = '';
    this.faceCaptureMessage = '';

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });

      if (this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.srcObject = this.mediaStream;
      }
    } catch (error) {
      console.error(error);
      this.faceCaptureError = 'Impossible d’accéder à la caméra.';
    }
  }

  captureFace() {
    this.faceCaptureError = '';
    this.faceCaptureMessage = '';

    const video = this.videoElement?.nativeElement;
    const canvas = this.canvasElement?.nativeElement;

    if (!video || !canvas) {
      this.faceCaptureError = 'Éléments vidéo/canvas introuvables.';
      return;
    }

    if (!this.mediaStream) {
      this.faceCaptureError = 'Veuillez ouvrir la caméra d’abord.';
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) {
      this.faceCaptureError = 'Vidéo non prête. Réessayez dans 1 seconde.';
      return;
    }

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      this.faceCaptureError = 'Impossible de capturer l’image.';
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    this.capturedImage = canvas.toDataURL('image/png');
    this.faceCaptureMessage = 'Photo capturée avec succès.';
  }

  stopCamera() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }

  async saveFaceToBackend() {
  this.faceCaptureMessage = '';
  this.faceCaptureError = '';

  const user = this.authService.getUser();
  const email = user?.email;

  if (!email) {
    this.faceCaptureError = 'Utilisateur non identifié.';
    return;
  }

  if (!this.capturedImage) {
    this.faceCaptureError = 'Aucune image capturée.';
    return;
  }

  try {
    await this.http.post('http://localhost:8080/api/face/register', {
      email: email,
      image: this.capturedImage
    }).toPromise();

    this.faceCaptureMessage = 'Visage enregistré avec succès.';
  } catch (error) {
    console.error(error);
    this.faceCaptureError = 'Erreur lors de l’enregistrement du visage.';
  }
}
}
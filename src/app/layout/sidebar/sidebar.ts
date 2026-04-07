import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { PasskeyService } from '../../core/services/passkey.service';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslateModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css'],
  standalone: true
})
export class SidebarComponent implements OnInit {
  isAdmin = false;
  isClient = false;
  isServiceManager = false;
  isChefEquipe = false;

  usersMenuOpen = false;
  reclamationsMenuOpen = false;
  teamsMenuOpen = false;
  serviceMenuOpen = false;

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
    private http: HttpClient,
    private translate: TranslateService
  ) {}

  ngOnInit() {
    const user = this.authService.getUser();
    if (user && user.roles) {
      this.isAdmin = user.roles.includes('ROLE_ADMIN');
      this.isServiceManager = user.roles.includes('ROLE_SERVICE_MANAGER');
      this.isChefEquipe = user.roles.includes('ROLE_CHEF_EQUIPE') || user.roles.includes('ROLE_AGENT');
      this.isClient = user.roles.includes('ROLE_CLIENT') || user.roles.includes('ROLE_USER');
    }
  }

  toggleUsersMenu() {
    this.usersMenuOpen = !this.usersMenuOpen;
  }

  toggleReclamationsMenu() {
    this.reclamationsMenuOpen = !this.reclamationsMenuOpen;
  }

  toggleTeamsMenu() {
    this.teamsMenuOpen = !this.teamsMenuOpen;
  }

  toggleServiceMenu() {
    this.serviceMenuOpen = !this.serviceMenuOpen;
  }

  async activateFaceId() {
    this.passkeyMessage = '';
    this.passkeyError = '';

    const user = this.authService.getUser();
    const email = user?.email;

    if (!email) {
      this.passkeyError = this.translate.instant('sidebar.errors.user_not_identified');
      return;
    }

    this.isRegisteringPasskey = true;

    try {
      const result: any = await this.passkeyService.startRegistration(email);
      this.passkeyMessage = result?.message || this.translate.instant('sidebar.messages.faceid_success');
    } catch (error: any) {
      console.error(error);
      this.passkeyError =
        error?.error?.message ||
        error?.message ||
        this.translate.instant('sidebar.errors.faceid_activation');
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
      this.faceCaptureError = this.translate.instant('sidebar.errors.camera_access');
    }
  }

  captureFace() {
    this.faceCaptureError = '';
    this.faceCaptureMessage = '';

    const video = this.videoElement?.nativeElement;
    const canvas = this.canvasElement?.nativeElement;

    if (!video || !canvas) {
      this.faceCaptureError = this.translate.instant('sidebar.errors.video_canvas_missing');
      return;
    }

    if (!this.mediaStream) {
      this.faceCaptureError = this.translate.instant('sidebar.errors.open_camera_first');
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) {
      this.faceCaptureError = this.translate.instant('sidebar.errors.video_not_ready');
      return;
    }

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      this.faceCaptureError = this.translate.instant('sidebar.errors.capture_failed');
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    this.capturedImage = canvas.toDataURL('image/png');
    this.faceCaptureMessage = this.translate.instant('sidebar.messages.photo_captured');
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
      this.faceCaptureError = this.translate.instant('sidebar.errors.user_not_identified');
      return;
    }

    if (!this.capturedImage) {
      this.faceCaptureError = this.translate.instant('sidebar.errors.no_captured_image');
      return;
    }

    try {
      await this.http.post('http://localhost:8080/api/face/register', {
        email: email,
        image: this.capturedImage
      }).toPromise();

      this.faceCaptureMessage = this.translate.instant('sidebar.messages.face_saved');
    } catch (error) {
      console.error(error);
      this.faceCaptureError = this.translate.instant('sidebar.errors.face_save');
    }
  }
}
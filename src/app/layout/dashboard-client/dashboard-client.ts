import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ReclamationService } from '../../core/services/reclamation.service';
import { Reclamation } from '../../core/models/reclamation.model';
import { ClientNavbarComponent } from '../client-navbar/client-navbar';
import { SidebarComponent } from '../sidebar/sidebar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-dashboard-client',
  standalone: true,
  imports: [CommonModule, FormsModule, ClientNavbarComponent, SidebarComponent, TranslateModule],
  templateUrl: './dashboard-client.html',
  styleUrls: ['./dashboard-client.css']
})
export class DashboardClientComponent implements OnInit {

  chatOpen = true;
  chatMessage = '';
  reclamations: Reclamation[] = [];

  chatMessages: { text: string; from: 'bot' | 'user'; time: string }[] = [];

  constructor(
    private reclamationService: ReclamationService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.chatMessages = [
      {
        text: this.translate.instant('client_dashboard.chat.welcome'),
        from: 'bot',
        time: this.getCurrentTime()
      }
    ];

    this.reclamationService.getMyReclamations().subscribe({
      next: (data) => {
        this.reclamations = data || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('DASHBOARD - ERREUR:', err);
        this.reclamations = [];
      }
    });
  }

  getStatusClass(statut: string): string {
    if (!statut) return 'status-pending';
    const s = statut.toLowerCase();
    if (s.includes('résol') || s.includes('resol') || s.includes('traitee')) return 'status-resolved';
    if (s.includes('rejet')) return 'status-rejected';
    if (s.includes('en cours') || s.includes('en_cours')) return 'status-progress';
    if (s.includes('attente') || s.includes('en_attente')) return 'status-pending';
    return 'status-pending';
  }

  translateStatus(statut: string | undefined): string {
    if (!statut) return '';
    return this.translate.instant('status.' + statut);
  }

  translateCategory(categorie: string | undefined): string {
    if (!categorie) return '';
    return this.translate.instant('categories.' + categorie);
  }

  toggleChat(): void {
    this.chatOpen = !this.chatOpen;
  }

  sendChat(): void {
    if (!this.chatMessage.trim()) return;

    this.chatMessages.push({
      text: this.chatMessage,
      from: 'user',
      time: this.getCurrentTime()
    });

    this.chatMessage = '';

    setTimeout(() => {
      this.chatMessages.push({
        text: this.translate.instant('client_dashboard.chat.auto_reply'),
        from: 'bot',
        time: this.getCurrentTime()
      });
    }, 1000);
  }

  onCreateReclamation(): void {
    this.router.navigate(['/mes-reclamations/nouvelle']);
  }

  private getCurrentTime(): string {
    const now = new Date();
    return now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  }
}
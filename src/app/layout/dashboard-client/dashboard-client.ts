import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ReclamationService } from '../../core/services/reclamation.service';
import { Reclamation } from '../../core/models/reclamation.model';
import { ClientNavbarComponent } from '../client-navbar/client-navbar';

@Component({
  selector: 'app-dashboard-client',
  standalone: true,
  imports: [CommonModule, FormsModule, ClientNavbarComponent],
  templateUrl: './dashboard-client.html',
  styleUrls: ['./dashboard-client.css']
})
export class DashboardClientComponent implements OnInit {

  chatOpen = true;
  chatMessage = '';
  reclamations: Reclamation[] = [];

  chatMessages: { text: string; from: 'bot' | 'user'; time: string }[] = [
    { text: 'Bonjour !\nComment puis-je vous aider ?', from: 'bot', time: this.getCurrentTime() }
  ];

  constructor(
    private reclamationService: ReclamationService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.reclamationService.getMyReclamations().subscribe({
      next: (data) => {
        console.log('DASHBOARD - RECLAMATIONS REÇUES:', data);
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
    if (s.includes('résol') || s.includes('resol')) return 'status-resolved';
    if (s.includes('rejet') || s.includes('rejet')) return 'status-rejected';
    if (s.includes('en cours') || s.includes('en_cours')) return 'status-progress';
    if (s.includes('attente') || s.includes('en_attente')) return 'status-pending';
    return 'status-pending';
  }



  toggleChat(): void {
    this.chatOpen = !this.chatOpen;
  }

  sendChat(): void {
    if (!this.chatMessage.trim()) return;
    this.chatMessages.push({ text: this.chatMessage, from: 'user', time: this.getCurrentTime() });
    const msg = this.chatMessage;
    this.chatMessage = '';
    // Simulate bot response
    setTimeout(() => {
      this.chatMessages.push({ text: 'Merci pour votre message. Un agent vous répondra bientôt.', from: 'bot', time: this.getCurrentTime() });
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

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../../layout/navbar/navbar';
import { Sidebar } from '../../layout/sidebar/sidebar';
import { TranslateModule } from '@ngx-translate/core';
import {
  MessageInterneService,
  MessageInterne
} from '../../core/services/message-interne.service';
import { ReclamationService } from '../../core/services/reclamation.service';

@Component({
  selector: 'app-messages-internes',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar, Sidebar, TranslateModule],
  templateUrl: './messages-internes.html',
  styleUrls: ['./messages-internes.css']
})
export class MessagesInternes implements OnInit {

  reclamations: any[] = [];
  selectedReclamationId: number | null = null;
  messages: MessageInterne[] = [];
  nouveauMessage: string = '';
  currentUserId: number = 0;
  isSending: boolean = false;
  isLoadingMessages: boolean = false;

  constructor(
    private messageInterneService: MessageInterneService,
    private reclamationService: ReclamationService
  ) {}

  ngOnInit(): void {
    this.loadCurrentUserId();
    this.loadReclamations();
  }

  loadCurrentUserId(): void {
    try {
      const userData = localStorage.getItem('user');

      if (userData) {
        const parsedUser = JSON.parse(userData);
        this.currentUserId = Number(parsedUser?.id) || 0;
      } else {
        this.currentUserId = Number(localStorage.getItem('userId')) || 0;
      }

      console.log('currentUserId =', this.currentUserId);
    } catch (error) {
      console.error('Erreur lecture user localStorage :', error);
      this.currentUserId = Number(localStorage.getItem('userId')) || 0;
      console.log('fallback currentUserId =', this.currentUserId);
    }
  }

  loadReclamations(): void {
    this.reclamationService.getAllReclamations().subscribe({
      next: (data) => {
        this.reclamations = data || [];
        console.log('Réclamations chargées :', this.reclamations);
      },
      error: (err) => {
        console.error('Erreur chargement réclamations :', err);
      }
    });
  }

  onReclamationChange(): void {
    if (!this.selectedReclamationId) {
      this.messages = [];
      return;
    }

    this.isLoadingMessages = true;
    console.log('Chargement messages pour réclamation :', this.selectedReclamationId);

    this.messageInterneService.getMessages(this.selectedReclamationId).subscribe({
      next: (data) => {
        this.messages = data || [];
        this.isLoadingMessages = false;
        console.log('Messages chargés :', this.messages);

        setTimeout(() => {
          this.scrollToBottom();
        }, 100);
      },
      error: (err) => {
        this.isLoadingMessages = false;
        console.error('Erreur chargement messages :', err);
      }
    });
  }

  envoyerMessage(): void {
    console.log('nouveauMessage =', this.nouveauMessage);
    console.log('selectedReclamationId =', this.selectedReclamationId);
    console.log('currentUserId =', this.currentUserId);

    if (!this.nouveauMessage.trim()) {
      console.warn('Envoi bloqué : message vide');
      return;
    }

    if (!this.selectedReclamationId) {
      console.warn('Envoi bloqué : aucune réclamation sélectionnée');
      return;
    }

    if (!this.currentUserId) {
      console.warn('Envoi bloqué : utilisateur introuvable');
      return;
    }

    const payload = {
      contenu: this.nouveauMessage.trim(),
      reclamationId: this.selectedReclamationId,
      auteurId: this.currentUserId
    };

    console.log('Payload envoyé :', payload);

    this.isSending = true;

    this.messageInterneService.envoyerMessage(payload).subscribe({
      next: (response) => {
        console.log('Message envoyé avec succès :', response);

        this.nouveauMessage = '';
        this.isSending = false;

        this.onReclamationChange();

        setTimeout(() => {
          this.scrollToBottom();
        }, 200);
      },
      error: (err) => {
        this.isSending = false;
        console.error('Erreur envoi message :', err);
      }
    });
  }

  isMyMessage(message: MessageInterne): boolean {
    return Number(message.auteurId) === Number(this.currentUserId);
  }

  trackByMessageId(index: number, message: MessageInterne): number {
    return message.id;
  }

  private scrollToBottom(): void {
    const container = document.querySelector('.chat-messages');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }
}
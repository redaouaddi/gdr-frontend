import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Sidebar } from '../../layout/sidebar/sidebar';
import { Navbar } from '../../layout/navbar/navbar';
import { AuthService } from '../../core/services/auth.service';
import { ReclamationService } from '../../core/services/reclamation.service';
import { MessageInterne, MessageInterneService } from '../../core/services/message-interne.service';
import { Reclamation } from '../../core/models/reclamation.model';

@Component({
  selector: 'app-internal-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, Sidebar, Navbar],
  templateUrl: './internal-messages.component.html',
  styleUrls: ['./internal-messages.component.css']
})
export class InternalMessagesComponent implements OnInit {
  reclamations: Reclamation[] = [];
  selectedReclamationId?: number;
  currentMessages: MessageInterne[] = [];
  newMessage = '';
  loadingReclamations = false;
  loadingMessages = false;
  sending = false;

  constructor(
    private authService: AuthService,
    private reclamationService: ReclamationService,
    private messageInterneService: MessageInterneService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadReclamationsByRole();
  }

  onSelectReclamation(value: string): void {
    const parsedId = Number(value);
    this.selectedReclamationId = Number.isFinite(parsedId) ? parsedId : undefined;
    this.currentMessages = [];
    if (this.selectedReclamationId) {
      this.loadMessages(this.selectedReclamationId);
    }
  }

  send(): void {
    if (!this.selectedReclamationId || !this.newMessage.trim() || this.sending) return;
    this.sending = true;
    this.messageInterneService.envoyerMessage(this.selectedReclamationId, this.newMessage.trim()).subscribe({
      next: (msg) => {
        this.currentMessages.push(msg);
        this.newMessage = '';
        this.sending = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.sending = false;
        this.cdr.detectChanges();
      }
    });
  }

  trackByMessageId(_: number, msg: MessageInterne): number {
    return msg.id;
  }

  private loadReclamationsByRole(): void {
    const user = this.authService.getUser();
    const roles = user?.roles || [];
    this.loadingReclamations = true;

    const source$ = roles.includes('ADMIN') || roles.includes('SERVICE_MANAGER')
      ? this.reclamationService.getAllReclamations()
      : roles.includes('CHEF_EQUIPE') || roles.includes('AGENT')
        ? this.reclamationService.getMesMissions()
        : this.reclamationService.getMyReclamations();

    source$.subscribe({
      next: (data) => {
        this.reclamations = data || [];
        this.loadingReclamations = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.reclamations = [];
        this.loadingReclamations = false;
        this.cdr.detectChanges();
      }
    });
  }

  private loadMessages(reclamationId: number): void {
    this.loadingMessages = true;
    this.messageInterneService.getMessages(reclamationId).subscribe({
      next: (data) => {
        this.currentMessages = data || [];
        this.loadingMessages = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.currentMessages = [];
        this.loadingMessages = false;
        this.cdr.detectChanges();
      }
    });
  }
}

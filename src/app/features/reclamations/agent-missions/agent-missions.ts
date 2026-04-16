import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReclamationService } from '../../../core/services/reclamation.service';
import { Reclamation } from '../../../core/models/reclamation.model';
import { Sidebar } from '../../../layout/sidebar/sidebar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Navbar } from '../../../layout/navbar/navbar';
import { MessageInterneService, MessageInterne } from '../../../core/services/message-interne.service';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-agent-missions',
  standalone: true,
  imports: [CommonModule, Sidebar, Navbar, TranslateModule, FormsModule, DatePipe],
  templateUrl: './agent-missions.html',
  styleUrls: ['./agent-missions.css']
})
export class AgentMissionsComponent implements OnInit {
  missions: Reclamation[] = [];
  loading = true;
  successMessage = '';
  errorMessage = '';

  // Internal Remarks state
  showNoteModal = false;
  currentMissionNotes: MessageInterne[] = [];
  newNoteText = '';
  selectedMissionId?: number;
  selectedMissionNumero?: string;
  isSendingNote = false;
  isLoadingNotes = false;

  constructor(
    private reclamationService: ReclamationService,
    private messageInterneService: MessageInterneService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadMissions();
  }

  loadMissions(): void {
    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';
    this.reclamationService.getMesMissions().subscribe({
      next: (data) => {
        this.missions = data || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('AGENT MISSIONS - ERREUR:', err);
        this.missions = [];
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  accepter(numeroReclamation: string): void {
    this.clearMessages();
    this.reclamationService.accepterReclamation(numeroReclamation).subscribe({
      next: () => {
        this.successMessage = this.translate.instant('agent_missions.messages.accepted', { numero: numeroReclamation });
        this.loadMissions();
      },
      error: (err) => {
        console.error('Erreur acceptation:', err);
        this.errorMessage = err.error?.message || this.translate.instant('agent_missions.messages.error_accept');
      }
    });
  }

  resoudre(numeroReclamation: string): void {
    this.clearMessages();
    this.reclamationService.marquerResolue(numeroReclamation).subscribe({
      next: () => {
        this.successMessage = this.translate.instant('agent_missions.messages.resolved', { numero: numeroReclamation });
        this.loadMissions();
      },
      error: (err) => {
        console.error('Erreur résolution:', err);
        this.errorMessage = err.error?.message || this.translate.instant('agent_missions.messages.error_resolve');
      }
    });
  }

  clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
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

  getPriorityClass(priority: string): string {
    if (!priority) return '';
    switch (priority.toUpperCase()) {
      case 'ELEVEE':
      case 'HAUTE':
      case 'URGENTE':
        return 'priority-high';
      case 'MOYENNE':
        return 'priority-medium';
      case 'FAIBLE':
      case 'BASSE':
        return 'priority-low';
      default:
        return '';
    }
  }

  // Remark Modal Methods
  openNoteModal(mission: Reclamation): void {
    if (!mission.id) return;
    this.selectedMissionId = mission.id;
    this.selectedMissionNumero = mission.numeroReclamation;
    this.newNoteText = '';
    this.showNoteModal = true;
    this.loadNotes(mission.id);
  }

  closeNoteModal(): void {
    this.showNoteModal = false;
    this.selectedMissionId = undefined;
    this.selectedMissionNumero = undefined;
    this.currentMissionNotes = [];
  }

  loadNotes(reclamationId: number): void {
    this.isLoadingNotes = true;
    this.messageInterneService.getMessages(reclamationId).subscribe({
      next: (data) => {
        this.currentMissionNotes = data || [];
        this.isLoadingNotes = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur chargement notes:', err);
        this.isLoadingNotes = false;
        this.cdr.detectChanges();
      }
    });
  }

  ajouterNote(): void {
    if (!this.selectedMissionId || !this.newNoteText.trim()) return;

    this.isSendingNote = true;
    this.messageInterneService.envoyerMessage(this.selectedMissionId, this.newNoteText).subscribe({
      next: (note) => {
        this.currentMissionNotes.push(note);
        this.newNoteText = '';
        this.isSendingNote = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur envoi note:', err);
        this.isSendingNote = false;
        this.cdr.detectChanges();
      }
    });
  }
}

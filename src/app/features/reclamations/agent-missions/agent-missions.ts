import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { ReclamationService } from '../../../core/services/reclamation.service';
import { Reclamation } from '../../../core/models/reclamation.model';
import { MessageInterneService, MessageInterne } from '../../../core/services/message-interne.service';

import { Sidebar } from '../../../layout/sidebar/sidebar';
import { Navbar } from '../../../layout/navbar/navbar';

@Component({
  selector: 'app-agent-missions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Sidebar,
    Navbar,
    TranslateModule,
    DatePipe
  ],
  templateUrl: './agent-missions.html',
  styleUrls: ['./agent-missions.css']
})
export class AgentMissionsComponent implements OnInit, OnDestroy {
  missions: Reclamation[] = [];
  loading = true;

  // Pagination for missions
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  successMessage = '';
  errorMessage = '';
  agentReportFile: File | null = null;
  slaAlertMessage = '';
  alreadyWarnedMissions: Set<string> = new Set();

  currentRole = '';
  isChefEquipe = false;
  isAgent = false;
  isClient = false;
  slaNotifications: any[] = [];
  showDetailsModal = false;
  selectedMissionDetails: Reclamation | null = null;
  agentSolutionText = '';

  // Nouveaux champs pour le compte rendu divisé
  causeIdentifiee = '';
  actionRealisee = '';
  solutionProposee = '';

  showRejectModal = false;
  selectedMissionToReject: Reclamation | null = null;
  motifRejet = '';
  rejectError = '';
  isRejecting = false;

  showNoteModal = false;
  currentMissionNotes: MessageInterne[] = [];
  newNoteText = '';
  selectedMissionId?: number;
  selectedMissionNumero?: string;
  isSendingNote = false;
  isLoadingNotes = false;

  // Pagination for notes
  notesCurrentPage = 0;
  notesPageSize = 10;
  notesTotalElements = 0;
  notesTotalPages = 0;

  private countdownInterval: any;
  private slaToastTimeout: any;

  constructor(
    private reclamationService: ReclamationService,
    private messageInterneService: MessageInterneService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.detectRole();
    this.loadMissions();
    this.startCountdownRefresh();
    this.loadStoredNotifications();

  }
  loadStoredNotifications(): void {
    const data = localStorage.getItem('slaNotifications');

    if (data) {
      this.slaNotifications = JSON.parse(data);
    }
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    if (this.slaToastTimeout) {
      clearTimeout(this.slaToastTimeout);
    }
  }

  detectRole(): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const role = user?.role || user?.roles?.[0] || '';

    this.currentRole = role;

    this.isChefEquipe =
      role === 'CHEF_EQUIPE' ||
      role === 'ROLE_CHEF_EQUIPE' ||
      role === 'SERVICE_MANAGER' ||
      role === 'ROLE_SERVICE_MANAGER';

    this.isAgent =
      role === 'AGENT' ||
      role === 'ROLE_AGENT';

    this.isClient =
      role === 'CLIENT' ||
      role === 'ROLE_CLIENT' ||
      role === 'USER' ||
      role === 'ROLE_USER';
  }

  loadMissions(): void {
    this.loading = true;

    this.reclamationService.getMesMissions(this.currentPage, this.pageSize).subscribe({
      next: (response) => {

        this.missions = (response.content || []).map((mission: any) => ({
          ...mission,
          slaCountdownLabel: this.computeSlaCountdownLabel(mission)
        }));
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;

        this.loading = false;
        this.cdr.detectChanges();
      },

      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadMissions();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadMissions();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadMissions();
    }
  }
  cleanResolvedNotifications(): void {
    this.slaNotifications = this.slaNotifications.filter(notif => {

      const mission = this.missions.find(m =>
        notif.message.includes(m.numeroReclamation)
      );

      // garder seulement si PAS traitée
      return mission && mission.statut !== 'TRAITEE';
    });

    localStorage.setItem('slaNotifications', JSON.stringify(this.slaNotifications));
  }

  accepter(numeroReclamation: string): void {
    this.clearMessages();

    this.reclamationService.accepterReclamation(numeroReclamation).subscribe({
      next: () => {
        this.successMessage = this.translate.instant('agent_missions.messages.accepted', {
          numero: numeroReclamation
        });
        this.loadMissions();
      },
      error: (err) => {
        console.error('Erreur acceptation:', err);
        this.errorMessage =
          err?.error?.message ||
          this.translate.instant('agent_missions.messages.error_accept');
      }
    });
  }

  openRejectModal(mission: Reclamation): void {
    this.selectedMissionToReject = mission;
    this.motifRejet = '';
    this.rejectError = '';
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.selectedMissionToReject = null;
    this.motifRejet = '';
    this.rejectError = '';
    this.isRejecting = false;
  }

  confirmReject(): void {
    if (!this.selectedMissionToReject?.numeroReclamation) {
      return;
    }

    if (!this.motifRejet.trim()) {
      this.rejectError = 'Le motif de rejet est obligatoire.';
      return;
    }

    this.isRejecting = true;
    this.rejectError = '';
    this.clearMessages();

    this.reclamationService
      .rejeterReclamation(this.selectedMissionToReject.numeroReclamation, this.motifRejet.trim())
      .subscribe({
        next: () => {
          this.successMessage = `Réclamation ${this.selectedMissionToReject?.numeroReclamation} rejetée avec succès.`;
          this.closeRejectModal();
          this.loadMissions();
        },
        error: (err) => {
          console.error('Erreur rejet:', err);
          this.rejectError =
            err?.error?.message || 'Erreur lors du rejet de la réclamation.';
          this.isRejecting = false;
        }
      });
  }

  resoudre(numeroReclamation: string): void {
    this.clearMessages();

    this.reclamationService.marquerResolue(numeroReclamation).subscribe({
      next: () => {
        this.successMessage = this.translate.instant('agent_missions.messages.resolved', {
          numero: numeroReclamation
        });
        this.loadMissions();
      },
      error: (err) => {
        console.error('Erreur résolution:', err);
        this.errorMessage =
          err?.error?.message ||
          this.translate.instant('agent_missions.messages.error_resolve');
      }
    });
  }

  openDetailsModal(mission: Reclamation): void {
    this.selectedMissionDetails = mission;
    this.agentSolutionText = '';
    
    // Si la réclamation est déjà clôturée, on pré-remplit les champs avec les données du backend
    if (mission.statut === 'TRAITEE') {
      this.causeIdentifiee = mission.causeIdentifiee || 'Cause non renseignée dans le système.';
      this.actionRealisee = mission.actionRealisee || 'Action non renseignée dans le système.';
      this.solutionProposee = mission.solutionProposee || 'Solution non renseignée dans le système.';
    } else {
      this.causeIdentifiee = '';
      this.actionRealisee = '';
      this.solutionProposee = '';
    }
    
    this.showDetailsModal = true;
    this.agentReportFile = null;
    this.cdr.detectChanges();
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedMissionDetails = null;
    this.agentSolutionText = '';
    this.causeIdentifiee = '';
    this.actionRealisee = '';
    this.solutionProposee = '';
    this.agentReportFile = null;
  }

  downloadReouvertureFile(rec: Reclamation): void {
    if (!rec || !rec.reouvertureAttachmentName) return;
    this.reclamationService.downloadReouvertureAttachment(rec.numeroReclamation).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = rec.reouvertureAttachmentName || 'piece-jointe-reouverture';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Erreur lors du téléchargement de la pièce jointe', err);
      }
    });
  }

  saveAgentSolution(): void {
    if (
      !this.selectedMissionDetails?.id ||
      !this.selectedMissionDetails?.numeroReclamation ||
      !this.causeIdentifiee.trim() ||
      !this.actionRealisee.trim() ||
      !this.solutionProposee.trim() ||
      !this.agentReportFile
    ) {
      this.errorMessage = "Tous les champs du compte rendu (Cause, Action, Solution) et la pièce jointe sont obligatoires.";
      return;
    }

    // Concatenation des 3 champs
    const completeReport = `CAUSE IDENTIFIÉE : ${this.causeIdentifiee.trim()}\n\nACTION RÉALISÉE : ${this.actionRealisee.trim()}\n\nSOLUTION PROPOSÉE : ${this.solutionProposee.trim()}`;

    this.clearMessages();

    this.messageInterneService
      .envoyerMessageAvecFichier(
        this.selectedMissionDetails.id,
        completeReport,
        this.agentReportFile
      )
      .subscribe({
        next: () => {
          this.reclamationService
            .marquerResolue(
              this.selectedMissionDetails!.numeroReclamation,
              this.causeIdentifiee.trim(),
              this.actionRealisee.trim(),
              this.solutionProposee.trim()
            )
            .subscribe({
              next: () => {
                this.selectedMissionDetails!.statut = 'TRAITEE';
                this.successMessage = this.translate.instant(
                  'agent_missions.messages.resolved',
                  {
                    numero: this.selectedMissionDetails?.numeroReclamation
                  }
                );

                this.agentSolutionText = '';
                this.causeIdentifiee = '';
                this.actionRealisee = '';
                this.solutionProposee = '';
                this.agentReportFile = null;

                // Petit délai pour laisser l'utilisateur voir le changement de couleur dans le parcours
                setTimeout(() => {
                  this.closeDetailsModal();
                  this.loadMissions();
                }, 1500);
              },
              error: (err) => {
                console.error('Erreur changement statut après compte rendu:', err);
                this.errorMessage = this.translate.instant(
                  'agent_missions.messages.report_saved_status_error'
                );
              }
            });
        },
        error: (err) => {
          console.error('Erreur enregistrement compte rendu agent:', err);
          this.errorMessage = this.translate.instant(
            'agent_missions.messages.report_save_error'
          );
        }
      });
  }

  openNoteModal(mission: Reclamation): void {
    this.selectedMissionId = mission.id;
    this.selectedMissionNumero = mission.numeroReclamation;
    this.newNoteText = '';
    this.showNoteModal = true;
    this.notesCurrentPage = 0;
    this.loadNotes(mission.id);
    this.cdr.detectChanges();
  }

  closeNoteModal(): void {
    this.showNoteModal = false;
    this.selectedMissionId = undefined;
    this.selectedMissionNumero = undefined;
    this.currentMissionNotes = [];
    this.cdr.detectChanges();
  }

  loadNotes(reclamationId: number): void {
    this.isLoadingNotes = true;

    this.messageInterneService.getMessages(reclamationId, this.notesCurrentPage, this.notesPageSize).subscribe({
      next: (response) => {
        this.currentMissionNotes = response.content || [];
        this.notesTotalElements = response.totalElements;
        this.notesTotalPages = response.totalPages;
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

  onNotesPageChange(page: number): void {
    this.notesCurrentPage = page;
    if (this.selectedMissionId) {
      this.loadNotes(this.selectedMissionId);
    }
  }

  ajouterNote(): void {
    if (!this.selectedMissionId || !this.newNoteText.trim()) return;

    this.isSendingNote = true;

    this.messageInterneService
      .envoyerMessage(this.selectedMissionId, this.newNoteText)
      .subscribe({
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

  clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }

  canChefAccept(mission: Reclamation): boolean {
    const status = (mission.statut || '').toUpperCase();
    return this.isChefEquipe && (status === 'EN_ATTENTE' || status === 'AFFECTEE');
  }

  canChefReject(mission: Reclamation): boolean {
    const status = (mission.statut || '').toUpperCase();
    return this.isChefEquipe && status !== 'TRAITEE' && status !== 'REJETEE';
  }

  canAgentResolve(mission: Reclamation): boolean {
    const status = (mission.statut || '').toUpperCase();
    return this.isAgent && (status === 'EN_COURS' || status === 'ACCEPTEE');
  }

  getStatusClass(statut?: string): string {
    if (!statut) return 'status-pending';

    const s = statut.toLowerCase();

    if (s.includes('résol') || s.includes('resol') || s.includes('traitee')) {
      return 'status-resolved';
    }

    if (s.includes('rejet')) {
      return 'status-rejected';
    }

    if (s.includes('en cours') || s.includes('en_cours')) {
      return 'status-progress';
    }

    if (s.includes('attente') || s.includes('en_attente')) {
      return 'status-pending';
    }

    return 'status-pending';
  }

  translateStatus(statut: string | undefined): string {
    if (!statut) return '';

    switch (statut.toUpperCase()) {
      case 'TRAITEE':
        return this.translate.instant('status.TRAITEE') || 'Traitée';

      case 'EN_ATTENTE':
        return this.translate.instant('status.EN_ATTENTE_CONFIRMATION') || 'En attente de confirmation';

      case 'EN_COURS':
        return this.translate.instant('status.EN_COURS_TRAITEMENT') || 'En cours de traitement';

      case 'REJETEE':
        return this.translate.instant('status.REJETEE') || 'Rejetée';

      default:
        return this.translate.instant('status.' + statut) || statut;
    }
  }

  translateCategory(categorie: string | undefined): string {
    if (!categorie) return '';
    return this.translate.instant('categories.' + categorie);
  }

  getPriorityClass(priority?: string): string {
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

  startCountdownRefresh(): void {
    this.countdownInterval = setInterval(() => {
      this.missions = this.missions.map((mission: any) => {
        const updatedLabel = this.computeSlaCountdownLabel(mission);

        if (
          this.isAgent &&
          mission.numeroReclamation &&
          updatedLabel !== 'SLA dépassé' &&
          this.shouldWarnBeforeSla(updatedLabel) &&
          !this.alreadyWarnedMissions.has(mission.numeroReclamation)
        ) {
          this.addSlaNotification(
            this.translate.instant('agent_missions.sla_notifications.near_title'),
            this.translate.instant('agent_missions.sla_notifications.near_message', {
              numero: mission.numeroReclamation
            }),
            'bi-exclamation-triangle-fill',
            'warning',
            mission.numeroReclamation + '-near'
          );

          this.alreadyWarnedMissions.add(mission.numeroReclamation);
        }

        return {
          ...mission,
          slaCountdownLabel: updatedLabel
        };
      });

      this.cdr.detectChanges();
    }, 1000);
  }

  computeSlaCountdownLabel(mission: any): string {
    const deadlineValue = mission?.slaDeadline;

    if (!deadlineValue) {
      return 'SLA indisponible';
    }

    const deadline = new Date(deadlineValue).getTime();
    const now = Date.now();

    if (isNaN(deadline)) {
      return 'SLA indisponible';
    }

    const diff = deadline - now;

    if (diff <= 0) {
      return 'SLA dépassé';
    }

    const totalSeconds = Math.floor(diff / 1000);

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) {
      return `${days}j ${hours}h ${minutes}m ${seconds}s`;
    }

    return `${hours}h ${minutes}m ${seconds}s`;
  }

  extractSlaHours(mission: any): number {
    if (mission?.slaHeures) return Number(mission.slaHeures);
    if (mission?.slaHours) return Number(mission.slaHours);
    if (mission?.sla?.delaiHeures) return Number(mission.sla.delaiHeures);
    if (mission?.sla?.hours) return Number(mission.sla.hours);

    const priority = (mission?.priorite || '').toUpperCase();

    switch (priority) {
      case 'URGENTE':
      case 'ELEVEE':
      case 'HAUTE':
        return 4;
      case 'MOYENNE':
        return 8;
      case 'FAIBLE':
      case 'BASSE':
        return 24;
      default:
        return 0;
    }
  }

  getSlaClass(label?: string): string {
    if (!label || label === 'SLA indisponible') return 'sla-normal';
    if (label === 'SLA dépassé') return 'sla-expired';
    if (label.includes('0h') || label.includes('1h')) return 'sla-warning';
    return 'sla-normal';
  }

  shouldWarnBeforeSla(label?: string): boolean {
    if (!label || label === 'SLA indisponible' || label === 'SLA dépassé') {
      return false;
    }

    const dayMatch = label.match(/(\d+)j/);
    if (dayMatch) return false;

    const match = label.match(/(\d+)h\s+(\d+)m\s+(\d+)s/);
    if (!match) return false;

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);

    return hours === 0 && minutes <= 59;
  }

  hasSlaWarning(mission: any): boolean {
    const label = mission.slaCountdownLabel;

    if (!label || label === 'SLA indisponible' || label === 'SLA dépassé') {
      return false;
    }

    const match = label.match(/(\d+)h\s+(\d+)m\s+(\d+)s/);
    if (!match) return false;

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);

    return hours < 1 || (hours === 1 && minutes === 0);
  }

  notifierAgentSla(mission: Reclamation): void {
    if (!mission.id) {
      return;
    }

    const message =
      `Alerte SLA : la réclamation ${mission.numeroReclamation} approche du dépassement. Merci de la traiter en priorité.`;

    this.messageInterneService.envoyerMessage(mission.id, message).subscribe({
      next: () => {
        this.successMessage =
          `Notification SLA envoyée pour la réclamation ${mission.numeroReclamation}.`;
      },
      error: (err) => {
        console.error('Erreur notification SLA:', err);
        this.errorMessage =
          'Erreur lors de l’envoi de la notification SLA.';
      }
    });
  }
  getRowSlaClass(mission: any): string {

    if (!this.isAgent) return '';

    if (mission.statut === 'TRAITEE') {
      return 'row-treated';
    }

    const label = mission.slaCountdownLabel;

    if (!label) return '';

    if (label === 'SLA dépassé') {
      return 'row-danger';
    }

    if (this.hasSlaWarning(mission)) {
      return 'row-warning';
    }

    return 'row-safe';
  }
  onAgentReportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      this.agentReportFile = input.files[0];
    }
  }

  addSlaNotification(
    title: string,
    message: string,
    icon: string,
    type: 'success' | 'warning' | 'danger' | 'info',
    key?: string
  ): void {
    if (key && this.slaNotifications.some(notif => notif.key === key)) {
      return;
    }

    const notification = {
      key,
      title,
      message,
      icon,
      type,
      date: new Date()
    };

    this.slaNotifications.unshift(notification);

    this.slaNotifications = this.slaNotifications.slice(0, 10);

    localStorage.setItem(
      'slaNotifications',
      JSON.stringify(this.slaNotifications)
    );
  }

}
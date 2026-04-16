import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EquipeService } from '../../../core/services/equipe.service';
import { Equipe } from '../../../core/models/equipe.model';
import { UserResponse } from '../../../core/services/user.service';
import { ReclamationService } from '../../../core/services/reclamation.service';
import { Reclamation } from '../../../core/models/reclamation.model';
import { Navbar } from '../../../layout/navbar/navbar';
import { Sidebar } from '../../../layout/sidebar/sidebar';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MessageInterneService, MessageInterne } from '../../../core/services/message-interne.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-my-team',
  standalone: true,
  imports: [CommonModule, Navbar, Sidebar, FormsModule, TranslateModule, DatePipe],
  templateUrl: './my-team.component.html'
})
export class MyTeamComponent implements OnInit {
  myTeam: Equipe | null = null;
  freeAgents: UserResponse[] = [];
  reclamations: Reclamation[] = [];
  isLoading = true;
  successMessage = '';
  errorMessage = '';

  selectedReclamation: Reclamation | null = null;
  motifRefus = '';

  // Internal Remarks state
  showNoteModal = false;
  currentMissionNotes: MessageInterne[] = [];
  newNoteText = '';
  selectedMissionNoteId?: number;
  selectedMissionNoteNumero?: string;
  isSendingNote = false;
  isLoadingNotes = false;

  constructor(
    private equipeService: EquipeService,
    private reclamationService: ReclamationService,
    private messageInterneService: MessageInterneService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadTeam();
  }

  loadTeam(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.equipeService.getMaGestion().subscribe({
      next: (team) => {
        this.isLoading = false;
        this.myTeam = team;
        if (this.myTeam && this.myTeam.id) {
          this.loadFreeAgents();
          this.loadReclamations(this.myTeam.id);
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Erreur chargement équipe:', err);
        if (err.status !== 404) {
          this.errorMessage = this.translate.instant('my_team.errors.load_team');
        }
      }
    });
  }

  loadFreeAgents(): void {
    this.equipeService.getFreeAgents().subscribe({
      next: (agents) => {
        this.freeAgents = agents;
      },
      error: (err) => {
        console.error('Erreur chargement agents libres', err);
      }
    });
  }

  recruter(agentId: number): void {
    this.successMessage = '';
    this.errorMessage = '';

    this.equipeService.recruterAgent(agentId).subscribe({
      next: (updatedTeam) => {
        this.freeAgents = this.freeAgents.filter(a => a.id !== agentId);
        this.myTeam = updatedTeam;
        this.successMessage = this.translate.instant('my_team.messages.agent_recruited');
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur recrutement', err);
        this.errorMessage = err.error?.message || this.translate.instant('my_team.errors.recruit_agent');
      }
    });
  }

  retirer(agentId: number): void {
    if (!confirm(this.translate.instant('my_team.confirm_remove_agent'))) return;

    this.successMessage = '';
    this.errorMessage = '';

    const agentToRemove = this.myTeam?.agents.find(a => a.id === agentId);

    this.equipeService.retirerAgent(agentId).subscribe({
      next: (updatedTeam) => {
        if (agentToRemove) {
          const newFreeAgent = {
            id: agentToRemove.id,
            firstName: agentToRemove.prenom,
            lastName: agentToRemove.nom,
            email: agentToRemove.email,
            gender: '',
            roles: [],
            deleted: false,
            createdAt: '',
            updatedAt: ''
          };
          this.freeAgents = [...this.freeAgents, newFreeAgent];
        }

        this.myTeam = updatedTeam;
        this.successMessage = this.translate.instant('my_team.messages.agent_removed');
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur retrait agent', err);
        this.errorMessage = err.error?.message || this.translate.instant('my_team.errors.remove_agent');
      }
    });
  }

  loadReclamations(teamId: number): void {
    this.reclamationService.getReclamationsParEquipe(teamId).subscribe({
      next: (data) => {
        this.reclamations = data;
      },
      error: (err) => console.error('Erreur chargement réclamations:', err)
    });
  }

  openRejectModal(reclamation: Reclamation): void {
    this.selectedReclamation = reclamation;
    this.motifRefus = '';
  }

  closeRejectModal(): void {
    this.selectedReclamation = null;
    this.motifRefus = '';
  }

  accepter(numeroReclamation: string): void {
    this.reclamationService.accepterReclamation(numeroReclamation).subscribe({
      next: () => {
        this.successMessage = this.translate.instant('my_team.messages.claim_accepted', {
          numero: numeroReclamation
        });
        if (this.myTeam && this.myTeam.id) this.loadReclamations(this.myTeam.id);
      },
      error: (err) => {
        console.error('Erreur acceptation', err);
        this.errorMessage = this.translate.instant('my_team.errors.accept_claim');
      }
    });
  }

  resoudre(numeroReclamation: string): void {
    this.reclamationService.marquerResolue(numeroReclamation).subscribe({
      next: () => {
        this.successMessage = this.translate.instant('my_team.messages.claim_resolved', {
          numero: numeroReclamation
        });
        if (this.myTeam && this.myTeam.id) this.loadReclamations(this.myTeam.id);
      },
      error: (err) => {
        console.error('Erreur résolution', err);
        this.errorMessage = this.translate.instant('my_team.errors.resolve_claim');
      }
    });
  }

  rejectReclamation(): void {
    if (!this.selectedReclamation || !this.motifRefus.trim()) return;

    this.reclamationService.rejeterReclamation(
      this.selectedReclamation.numeroReclamation,
      this.motifRefus
    ).subscribe({
      next: () => {
        this.successMessage = this.translate.instant('my_team.messages.claim_rejected', {
          numero: this.selectedReclamation?.numeroReclamation
        });
        this.closeRejectModal();
        if (this.myTeam?.id) {
          this.loadReclamations(this.myTeam.id);
        }
      },
      error: (err) => {
        console.error('Erreur rejet réclamation', err);
        this.errorMessage = this.translate.instant('my_team.errors.reject_claim');
      }
    });
  }

  translateStatus(statut: string | undefined): string {
    if (!statut) return '';
    return this.translate.instant('status.' + statut);
  }

  translatePriority(priorite: string | undefined): string {
    if (!priorite) return '';
    return this.translate.instant('priority.' + priorite);
  }

  translateCategory(categorie: string | undefined): string {
    if (!categorie) return '';
    return this.translate.instant('categories.' + categorie);
  }

  // Remark Modal Methods
  openNoteModal(mission: Reclamation): void {
    if (!mission.id) return;
    this.selectedMissionNoteId = mission.id;
    this.selectedMissionNoteNumero = mission.numeroReclamation;
    this.newNoteText = '';
    this.showNoteModal = true;
    this.loadNotes(mission.id);
  }

  closeNoteModal(): void {
    this.showNoteModal = false;
    this.selectedMissionNoteId = undefined;
    this.selectedMissionNoteNumero = undefined;
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
    if (!this.selectedMissionNoteId || !this.newNoteText.trim()) return;

    this.isSendingNote = true;
    this.messageInterneService.envoyerMessage(this.selectedMissionNoteId, this.newNoteText).subscribe({
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
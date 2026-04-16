import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReclamationService } from '../../../core/services/reclamation.service';
import { EquipeService } from '../../../core/services/equipe.service';
import { Reclamation } from '../../../core/models/reclamation.model';
import { Equipe } from '../../../core/models/equipe.model';
import { finalize, timeout } from 'rxjs/operators';
import { Navbar } from '../../../layout/navbar/navbar';
import { Sidebar } from '../../../layout/sidebar/sidebar';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MessageInterneService, MessageInterne } from '../../../core/services/message-interne.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-service-manager-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar, Sidebar, TranslateModule, DatePipe],
  templateUrl: './service-manager-dashboard.component.html',
  styleUrls: ['./service-manager-dashboard.component.css']
})
export class ServiceManagerDashboardComponent implements OnInit {
  reclamations: Reclamation[] = [];
  equipes: Equipe[] = [];

  activeView: 'stats' | 'list' = 'stats';

  stats = {
    attente: 0,
    encours: 0,
    resolues: 0,
    rejetees: 0
  };

  isLoading = true;
  errorMessage = '';

  selectedReclamation: Reclamation | null = null;
  selectedEquipeId: number | null = null;
  teamSearchTerm = '';
  isAssigning = false;

  // Internal Remarks state
  showNoteModal = false;
  currentMissionNotes: MessageInterne[] = [];
  newNoteText = '';
  selectedMissionNoteId?: number;
  selectedMissionNoteNumero?: string;
  isSendingNote = false;
  isLoadingNotes = false;

  get filteredEquipes(): Equipe[] {
    if (!this.teamSearchTerm.trim()) return this.equipes;
    return this.equipes.filter(e =>
      e.nom.toLowerCase().includes(this.teamSearchTerm.toLowerCase())
    );
  }

  constructor(
    private reclamationService: ReclamationService,
    private equipeService: EquipeService,
    private messageInterneService: MessageInterneService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['view'] === 'list') {
        this.activeView = 'list';
      } else {
        this.activeView = 'stats';
      }
    });
    this.initialLoad();
  }

  selectEquipe(id: number | undefined): void {
    if (id !== undefined) {
      this.selectedEquipeId = id;
    }
  }

  initialLoad(): void {
    this.isLoading = true;
    this.loadData();
  }

  loadData(): void {
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.equipeService.getAllTeams()
      .pipe(timeout(15000))
      .subscribe({
        next: (teams) => this.equipes = teams,
        error: (err) => console.error('Erreur chargement équipes', err)
      });

    this.reclamationService.getAllReclamations()
      .pipe(
        timeout(15000),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data) => {
          this.reclamations = data;
          this.stats = {
            attente: data.filter(r => r.statut === 'EN_ATTENTE').length,
            encours: data.filter(r => r.statut === 'EN_COURS').length,
            resolues: data.filter(r => r.statut === 'TRAITEE').length,
            rejetees: data.filter(r => r.statut === 'REJETEE').length
          };
        },
        error: (err) => {
          console.error('Erreur chargement réclamations', err);
          this.errorMessage = this.translate.instant('service_manager.errors.server_error');
        }
      });
  }

  openAssignModal(rec: Reclamation): void {
    this.selectedReclamation = rec;
    this.selectedEquipeId = null;
    this.errorMessage = '';
  }

  closeAssignModal(): void {
    this.selectedReclamation = null;
    this.selectedEquipeId = null;
    this.teamSearchTerm = '';
  }

  confirmAssign(): void {
    if (!this.selectedReclamation || !this.selectedEquipeId) return;

    this.isAssigning = true;
    this.reclamationService.assignerEquipe(this.selectedReclamation.numeroReclamation, this.selectedEquipeId)
      .pipe(finalize(() => this.isAssigning = false))
      .subscribe({
        next: () => {
          this.closeAssignModal();
          this.loadData();
        },
        error: (err) => {
          console.error("Erreur d'assignation", err);
          this.errorMessage = this.translate.instant('service_manager.errors.assign_failed');
        }
      });
  }

  translateStatus(statut: string | undefined): string {
    if (!statut) return '';
    return this.translate.instant('status.' + statut);
  }

  translatePriority(priorite: string | undefined): string {
    if (!priorite) return this.translate.instant('service_manager.undefined_priority');
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
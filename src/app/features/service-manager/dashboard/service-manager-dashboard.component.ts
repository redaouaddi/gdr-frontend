import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReclamationService } from '../../../core/services/reclamation.service';
import { EquipeService } from '../../../core/services/equipe.service';
import { Reclamation } from '../../../core/models/reclamation.model';
import { Equipe } from '../../../core/models/equipe.model';
import { finalize, timeout } from 'rxjs/operators';
import { NavbarComponent } from '../../../layout/navbar/navbar';
import { SidebarComponent } from '../../../layout/sidebar/sidebar';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-service-manager-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, SidebarComponent],
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

  // Modal State
  selectedReclamation: Reclamation | null = null;
  selectedEquipeId: number | null = null;
  teamSearchTerm = '';
  isAssigning = false;

  get filteredEquipes(): Equipe[] {
    if (!this.teamSearchTerm.trim()) return this.equipes;
    return this.equipes.filter(e => 
      e.nom.toLowerCase().includes(this.teamSearchTerm.toLowerCase())
    );
  }

  selectEquipe(id: number | undefined): void {
    if (id !== undefined) {
      this.selectedEquipeId = id;
    }
  }

  constructor(
    private reclamationService: ReclamationService,
    private equipeService: EquipeService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute
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

  initialLoad(): void {
    this.isLoading = true;
    this.loadData();
  }

  loadData(): void {
    this.errorMessage = '';
    this.cdr.detectChanges();
    
    // Load teams for assignment
    this.equipeService.getAllTeams()
    .pipe(timeout(15000))
    .subscribe({
      next: (teams) => this.equipes = teams,
      error: (err) => console.error("Erreur chargement équipes", err)
    });

    // Load reclamations
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
        console.error("Erreur chargement réclamations", err);
        this.errorMessage = 'Le serveur met trop de temps à répondre ou est inaccessible.';
      }
    });
  }

  // Removed setView since it relies on the router directly now.

  openAssignModal(rec: Reclamation): void {
    this.selectedReclamation = rec;
    this.selectedEquipeId = null;
    this.errorMessage = '';
  }

  closeAssignModal(): void {
    this.selectedReclamation = null;
    this.selectedEquipeId = null;
  }

  confirmAssign(): void {
    if (!this.selectedReclamation || !this.selectedEquipeId) return;
    
    this.isAssigning = true;
    this.reclamationService.assignerEquipe(this.selectedReclamation.numeroReclamation, this.selectedEquipeId)
    .pipe(finalize(() => this.isAssigning = false))
    .subscribe({
      next: () => {
        this.closeAssignModal();
        this.loadData(); // Will refresh list without global spinner
      },
      error: (err) => {
        console.error("Erreur d'assignation", err);
        this.errorMessage = "Impossible d'assigner l'équipe. Veuillez réessayer.";
      }
    });
  }
}

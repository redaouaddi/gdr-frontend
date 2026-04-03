import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EquipeService } from '../../../core/services/equipe.service';
import { Equipe } from '../../../core/models/equipe.model';
import { UserResponse } from '../../../core/services/user.service';
import { ReclamationService } from '../../../core/services/reclamation.service';
import { Reclamation } from '../../../core/models/reclamation.model';
import { NavbarComponent } from '../../../layout/navbar/navbar';
import { SidebarComponent } from '../../../layout/sidebar/sidebar';
import { FormsModule } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-my-team',
  standalone: true,
  imports: [CommonModule, NavbarComponent, SidebarComponent, FormsModule],
  templateUrl: './my-team.component.html'
})
export class MyTeamComponent implements OnInit {
  myTeam: Equipe | null = null;
  freeAgents: UserResponse[] = [];
  reclamations: Reclamation[] = [];
  isLoading = true;
  successMessage = '';
  errorMessage = '';

  // For rejection modal
  selectedReclamation: Reclamation | null = null;
  motifRefus = '';

  constructor(
    private equipeService: EquipeService,
    private reclamationService: ReclamationService,
    private cdr: ChangeDetectorRef
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
        console.log('Equipe chargée:', team);
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
          this.errorMessage = 'Impossible de charger les données de votre équipe.';
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
        // Instant update: remove from free agents
        this.freeAgents = this.freeAgents.filter(a => a.id !== agentId);
        
        this.myTeam = updatedTeam;
        this.successMessage = 'Agent recruté avec succès !';
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur recrutement', err);
        this.errorMessage = err.error?.message || "Échec du recrutement de l'agent.";
      }
    });
  }

  retirer(agentId: number): void {
    if (!confirm('Etes-vous sûr de vouloir retirer cet agent de votre équipe ?')) return;

    this.successMessage = '';
    this.errorMessage = '';

    const agentToRemove = this.myTeam?.agents.find(a => a.id === agentId);

    this.equipeService.retirerAgent(agentId).subscribe({
      next: (updatedTeam) => {
        // Instant update: add to free agents
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
        this.successMessage = 'Agent retiré de l\'équipe avec succès.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur retrait agent', err);
        this.errorMessage = err.error?.message || "Impossible de retirer l'agent.";
      }
    });
  }

  loadReclamations(teamId: number): void {
    console.log('Chargement des réclamations pour équipe:', teamId);
    this.reclamationService.getReclamationsParEquipe(teamId).subscribe({
      next: (data) => {
        console.log('Réclamations chargées:', data.length);
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
        this.successMessage = `Réclamation ${numeroReclamation} acceptée.`;
        if (this.myTeam && this.myTeam.id) this.loadReclamations(this.myTeam.id);
      },
      error: (err) => {
        console.error('Erreur acceptation', err);
        this.errorMessage = "Impossible d'accepter la réclamation.";
      }
    });
  }

  resoudre(numeroReclamation: string): void {
    this.reclamationService.marquerResolue(numeroReclamation).subscribe({
      next: () => {
        this.successMessage = `Réclamation ${numeroReclamation} marquée comme résolue.`;
        if (this.myTeam && this.myTeam.id) this.loadReclamations(this.myTeam.id);
      },
      error: (err) => {
        console.error('Erreur résolution', err);
        this.errorMessage = "Impossible de clore la réclamation.";
      }
    });
  }

  rejectReclamation(): void {
    if (!this.selectedReclamation || !this.motifRefus.trim()) return;

    this.reclamationService.rejeterReclamation(this.selectedReclamation.numeroReclamation, this.motifRefus).subscribe({
      next: () => {
        this.successMessage = `Réclamation ${this.selectedReclamation?.numeroReclamation} rejetée.`;
        this.closeRejectModal();
        if (this.myTeam?.id) {
          this.loadReclamations(this.myTeam.id);
        }
      },
      error: (err) => {
        console.error('Erreur rejet réclamation', err);
        this.errorMessage = 'Erreur lors du rejet de la réclamation.';
      }
    });
  }
}

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EquipeService } from '../../../core/services/equipe.service';
import { Equipe } from '../../../core/models/equipe.model';
import { UserResponse } from '../../../core/services/user.service';
import { Navbar } from '../../../layout/navbar/navbar';
import { Sidebar } from '../../../layout/sidebar/sidebar';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-my-team',
  standalone: true,
  imports: [CommonModule, Navbar, Sidebar, FormsModule, TranslateModule],
  templateUrl: './my-team.component.html'
})
export class MyTeamComponent implements OnInit {
  myTeam: Equipe | null = null;
  freeAgents: UserResponse[] = [];
  canManageTeam = false;
  isLoading = true;
  successMessage = '';
  errorMessage = '';

  constructor(
    private equipeService: EquipeService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const roles = this.authService.getUser()?.roles || [];
    this.canManageTeam = roles.includes('CHEF_EQUIPE');
    this.loadTeam();
  }

  loadTeam(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.equipeService.getMaGestion().subscribe({
      next: (team) => {
        this.isLoading = false;
        this.myTeam = team;
        if (this.myTeam && this.canManageTeam) {
          this.loadFreeAgents();
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
}
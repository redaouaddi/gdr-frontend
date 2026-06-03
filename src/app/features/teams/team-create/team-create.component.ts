import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EquipeService } from '../../../core/services/equipe.service';
import { AgentResponse, Equipe } from '../../../core/models/equipe.model';
import { Navbar } from '../../../layout/navbar/navbar';
import { Sidebar } from '../../../layout/sidebar/sidebar';
import { UserService, UserResponse } from '../../../core/services/user.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-team-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    Navbar,
    Sidebar,
    TranslateModule
  ],
  templateUrl: './team-create.component.html'
})
export class TeamCreateComponent implements OnInit {
  teamForm: FormGroup;
  users: UserResponse[] = [];
  createdTeam: Equipe | null = null;
  freeAgents: any[] = [];
  isLoading = false;
  isFetching = false;
  successMessage = '';
  errorMessage = '';
  memberSuccessMessage = '';
  memberErrorMessage = '';
  selectedAgentIds: number[] = [];

  constructor(
    private fb: FormBuilder,
    private equipeService: EquipeService,
    private userService: UserService,
    private router: Router,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {
    this.teamForm = this.fb.group({
      nom: ['', Validators.required],
      chefEmail: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    this.loadChefsEquipe();
    this.loadFreeAgents();
  }

  loadChefsEquipe(): void {
    forkJoin({
      usersPage: this.userService.getAllUsers(0, 1000),
      equipesPage: this.equipeService.getAllTeams(0, 1000)
    }).subscribe({
      next: ({ usersPage, equipesPage }) => {
        const users = usersPage.content || [];
        const equipes = equipesPage.content || [];

        // Emails des chefs déjà assignés à une équipe
        const chefsDejaAssignes = new Set(
          equipes
            .filter(e => e.chefEquipeEmail)
            .map(e => e.chefEquipeEmail!)
        );

        // Emails des agents déjà assignés à une équipe
        const agentsAssignes = new Set<string>();
        equipes.forEach(e => {
          if (e.agents) {
            e.agents.forEach(a => agentsAssignes.add(a.email));
          }
        });

        // Garder uniquement les chefs/managers qui ne sont ni chefs d'une autre équipe, ni agents
        this.users = users.filter(user =>
          user.roles &&
          (
            user.roles.includes('CHEF_EQUIPE') ||
            user.roles.includes('SERVICE_MANAGER') ||
            user.roles.includes('ROLE_CHEF_EQUIPE') ||
            user.roles.includes('ROLE_SERVICE_MANAGER')
          ) &&
          !chefsDejaAssignes.has(user.email) &&
          !agentsAssignes.has(user.email)
        );
      },
      error: (err) => {
        console.error('Erreur chargement données', err);
      }
    });
  }

  onSubmit(): void {
    if (this.teamForm.invalid) {
      this.teamForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = { ...this.teamForm.value, agentIds: this.selectedAgentIds };

    this.equipeService.createTeam(payload).subscribe({
      next: (team) => {
        this.successMessage = this.translate.instant('team_create.messages.success');
        this.createdTeam = team;
        this.teamForm.reset();
        this.loadFreeAgents();
        this.cdr.detectChanges();

        setTimeout(() => {
          this.router.navigate(['/dashboard/admin']);
        }, 2000);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Erreur lors de la création de l\'équipe', err);

        if (typeof err.error === 'string') {
          this.errorMessage = err.error;
        } else if (err.error?.message) {
          this.errorMessage = err.error.message;
        } else if (err.error) {
          this.errorMessage =
            this.translate.instant('team_create.errors.server_details') +
            ' : ' +
            JSON.stringify(err.error);
        } else {
          this.errorMessage = this.translate.instant('team_create.errors.unknown');
        }
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  loadFreeAgents(): void {
    this.equipeService.getFreeAgents(0, 1000).subscribe({
      next: (response) => {
        this.freeAgents = response.content || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur chargement agents libres', err);
      }
    });
  }

  toggleAgentSelection(agentId: number): void {
    const index = this.selectedAgentIds.indexOf(agentId);
    if (index > -1) {
      this.selectedAgentIds.splice(index, 1);
    } else {
      this.selectedAgentIds.push(agentId);
    }
  }

  recruter(agentId: number): void {
    if (!this.createdTeam?.id) return;

    this.memberSuccessMessage = '';
    this.memberErrorMessage = '';

    this.equipeService.recruterAgent(this.createdTeam.id, agentId).subscribe({
      next: (updatedTeam) => {
        this.createdTeam = updatedTeam;
        this.freeAgents = this.freeAgents.filter(a => a.id !== agentId);
        this.memberSuccessMessage = 'Agent ajouté avec succès.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.memberErrorMessage = err.error?.message || 'Erreur lors de l\'ajout de l\'agent.';
        this.cdr.detectChanges();
      }
    });
  }

  retirer(agentId: number): void {
    if (!this.createdTeam?.id || !confirm('Confirmer le retrait de cet agent ?')) return;

    this.memberSuccessMessage = '';
    this.memberErrorMessage = '';

    const agentToRemove = this.createdTeam.agents.find(a => a.id === agentId);

    this.equipeService.retirerAgent(this.createdTeam.id, agentId).subscribe({
      next: (updatedTeam) => {
        this.createdTeam = updatedTeam;
        if (agentToRemove) {
          this.freeAgents = [...this.freeAgents, {
            id: agentToRemove.id,
            firstName: agentToRemove.prenom,
            lastName: agentToRemove.nom,
            email: agentToRemove.email,
            gender: '',
            roles: [],
            deleted: false,
            createdAt: '',
            updatedAt: ''
          }];
        }
        this.memberSuccessMessage = 'Agent retiré avec succès.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.memberErrorMessage = err.error?.message || 'Erreur lors du retrait de l\'agent.';
        this.cdr.detectChanges();
      }
    });
  }
}
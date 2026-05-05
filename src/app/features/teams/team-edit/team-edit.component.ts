import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EquipeService } from '../../../core/services/equipe.service';
import { UserService, UserResponse } from '../../../core/services/user.service';
import { AgentResponse, Equipe } from '../../../core/models/equipe.model';
import { Navbar } from '../../../layout/navbar/navbar';
import { Sidebar } from '../../../layout/sidebar/sidebar';
import { finalize, timeout } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-team-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    Navbar,
    Sidebar,
    TranslateModule
  ],
  templateUrl: './team-edit.component.html'
})
export class TeamEditComponent implements OnInit {
  teamForm: FormGroup;
  teamId!: number;
  users: UserResponse[] = [];
  currentTeam: Equipe | null = null;
  freeAgents: UserResponse[] = [];
  isLoading = false;
  isFetching = true;
  successMessage = '';
  errorMessage = '';
  memberSuccessMessage = '';
  memberErrorMessage = '';

  constructor(
    private fb: FormBuilder,
    private equipeService: EquipeService,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService
  ) {
    this.teamForm = this.fb.group({
      nom: ['', Validators.required],
      chefEmail: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.teamId = parseInt(idParam, 10);
      this.loadAll();
    } else {
      this.errorMessage = this.translate.instant('team_edit.errors.missing_id');
      this.isFetching = false;
    }
  }

  loadAll(): void {
    this.isFetching = true;

    forkJoin({
      users: this.userService.getAllUsers(),
      equipes: this.equipeService.getAllTeams(),
      freeAgents: this.equipeService.getFreeAgents()
    }).pipe(
      finalize(() => {
        this.isFetching = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: ({ users, equipes, freeAgents }) => {
        const equipe = equipes.find(eq => eq.id === this.teamId);

        if (!equipe) {
          this.errorMessage = this.translate.instant('team_edit.errors.not_found');
          return;
        }

        this.currentTeam = equipe;
        this.freeAgents = freeAgents;

        // Chefs disponibles = ceux avec le bon rôle,
        // qui ne sont pas déjà chefs d'une autre équipe (sauf le chef actuel de cette équipe)
        const chefsDejaAssignes = new Set(
          equipes
            .filter(e => e.chefEquipeId && e.id !== this.teamId)
            .map(e => e.chefEquipeId)
        );

        this.users = users.filter(user =>
          user.roles &&
          (
            user.roles.includes('CHEF_EQUIPE') ||
            user.roles.includes('ROLE_CHEF_EQUIPE') ||
            user.roles.includes('SERVICE_MANAGER') ||
            user.roles.includes('ROLE_SERVICE_MANAGER')
          ) &&
          !chefsDejaAssignes.has(user.id)
        );

        this.teamForm.patchValue({
          nom: equipe.nom,
          chefEmail: equipe.chefEquipeEmail ?? ''
        });
      },
      error: (err) => {
        console.error('Erreur chargement données', err);
        this.errorMessage = this.translate.instant('team_edit.errors.load_failed');
      }
    });
  }

  recruter(agentId: number): void {
    this.memberSuccessMessage = '';
    this.memberErrorMessage = '';

    this.equipeService.recruterAgent(this.teamId, agentId).subscribe({
      next: (updatedTeam) => {
        this.currentTeam = updatedTeam;
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
    if (!confirm('Confirmer le retrait de cet agent ?')) return;

    this.memberSuccessMessage = '';
    this.memberErrorMessage = '';

    const agentToRemove = this.currentTeam?.agents.find(a => a.id === agentId);

    this.equipeService.retirerAgent(this.teamId, agentId).subscribe({
      next: (updatedTeam) => {
        this.currentTeam = updatedTeam;
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

  onSubmit(): void {
    if (this.teamForm.invalid) {
      this.teamForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    this.equipeService.updateTeam(this.teamId, this.teamForm.value)
      .pipe(
        timeout(15000),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.successMessage = this.translate.instant('team_edit.messages.success');
          setTimeout(() => this.router.navigate(['/admin/teams']), 1500);
        },
        error: (err) => {
          if (typeof err.error === 'string') {
            this.errorMessage = err.error;
          } else if (err.error?.message) {
            this.errorMessage = err.error.message;
          } else {
            this.errorMessage = this.translate.instant('team_edit.errors.unknown');
          }
        }
      });
  }
}
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EquipeService } from '../../../core/services/equipe.service';
import { UserService, UserResponse } from '../../../core/services/user.service';
import { Navbar } from '../../../layout/navbar/navbar';
import { Sidebar } from '../../../layout/sidebar/sidebar';
import { finalize, timeout } from 'rxjs/operators';
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
  isLoading = false;
  isFetching = true;
  successMessage = '';
  errorMessage = '';

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
    this.userService.getAllUsers().subscribe({
      next: (data) => {
        this.users = data.filter(
          user => user.roles && (user.roles.includes('ROLE_CHEF_EQUIPE') || user.roles.includes('ROLE_SERVICE_MANAGER'))
        );
      },
      error: (err) => console.error('Erreur chargement utilisateurs', err)
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.teamId = parseInt(idParam, 10);
      this.loadTeamData();
    } else {
      this.errorMessage = this.translate.instant('team_edit.errors.missing_id');
      this.isFetching = false;
    }
  }

  loadTeamData(): void {
    this.isFetching = true;
    this.cdr.detectChanges();

    this.equipeService.getAllTeams()
      .pipe(
        timeout(15000),
        finalize(() => {
          this.isFetching = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (equipes) => {
          const equipe = equipes.find(eq => eq.id === this.teamId);

          if (equipe) {
            this.teamForm.patchValue({
              nom: equipe.nom,
              chefEmail: equipe.chefEmail
            });
          } else {
            this.errorMessage = this.translate.instant('team_edit.errors.not_found');
          }
        },
        error: (err) => {
          console.error('Erreur chargement de la liste des équipes', err);
          this.errorMessage = this.translate.instant('team_edit.errors.load_failed');
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

    const payload = this.teamForm.value;
    this.cdr.detectChanges();

    this.equipeService.updateTeam(this.teamId, payload)
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
          setTimeout(() => {
            this.router.navigate(['/admin/teams']);
          }, 1500);
        },
        error: (err) => {
          console.error('Erreur lors de la modification de l\'équipe', err);

          if (typeof err.error === 'string') {
            this.errorMessage = err.error;
          } else if (err.error?.message) {
            this.errorMessage = err.error.message;
          } else if (err.error) {
            this.errorMessage =
              this.translate.instant('team_edit.errors.server') +
              ' : ' +
              JSON.stringify(err.error);
          } else {
            this.errorMessage = this.translate.instant('team_edit.errors.unknown');
          }
        }
      });
  }
}
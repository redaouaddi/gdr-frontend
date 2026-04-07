import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EquipeService } from '../../../core/services/equipe.service';
import { NavbarComponent } from '../../../layout/navbar/navbar';
import { SidebarComponent } from '../../../layout/sidebar/sidebar';
import { UserService, UserResponse } from '../../../core/services/user.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-team-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    NavbarComponent,
    SidebarComponent,
    TranslateModule
  ],
  templateUrl: './team-create.component.html'
})
export class TeamCreateComponent implements OnInit {
  teamForm: FormGroup;
  users: UserResponse[] = [];
  isLoading = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private equipeService: EquipeService,
    private userService: UserService,
    private router: Router,
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
      error: (err) => {
        console.error('Erreur chargement utilisateurs', err);
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

    this.equipeService.createTeam(payload).subscribe({
      next: () => {
        this.successMessage = this.translate.instant('team_create.messages.success');
        this.teamForm.reset();
        setTimeout(() => {
          this.router.navigate(['/dashboard/admin']);
        }, 1500);
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
}
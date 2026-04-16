import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { ClientNavbarComponent } from '../../../layout/client-navbar/client-navbar';
import { Sidebar } from '../../../layout/sidebar/sidebar';
import { ReclamationService } from '../../../core/services/reclamation.service';
import { CreateReclamationRequest } from '../../../core/models/reclamation.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-reclamation-create',
  standalone: true,
  imports: [CommonModule, FormsModule, ClientNavbarComponent, Sidebar, TranslateModule],
  templateUrl: './reclamation-create.component.html',
  styleUrls: ['./reclamation-create.component.css']
})
export class ReclamationCreateComponent {
  reclamation: CreateReclamationRequest = {
    titre: '',
    description: '',
    categorie: 'PROJET',
    priorite: 'MOYENNE',
    typeMaintenance: undefined,
    sousCategorieIncident: undefined,
    detailsAutreIncident: '',
    dateCreation: new Date().toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  };

  selectedFile: File | null = null;
  isSubmitting = false;
  showSuccess = false;
  countdown = 3;
  successMessage = '';
  errorMessage = '';

  constructor(
    private reclamationService: ReclamationService,
    private router: Router,
    private translate: TranslateService
  ) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.reclamation.titre.trim()) {
      this.errorMessage = this.translate.instant('reclamation_create.errors.title_required');
      return;
    }

    if (!this.reclamation.description.trim()) {
      this.errorMessage = this.translate.instant('reclamation_create.errors.description_required');
      return;
    }

    if (this.reclamation.categorie === 'MAINTENANCE' && !this.reclamation.typeMaintenance) {
      this.errorMessage = this.translate.instant('reclamation_create.errors.maintenance_type_required');
      return;
    }

    if (
      this.reclamation.categorie === 'MAINTENANCE' &&
      this.reclamation.typeMaintenance === 'INCIDENT' &&
      !this.reclamation.sousCategorieIncident
    ) {
      this.errorMessage = this.translate.instant('reclamation_create.errors.incident_domain_required');
      return;
    }

    if (
      this.reclamation.categorie === 'MAINTENANCE' &&
      this.reclamation.typeMaintenance === 'INCIDENT' &&
      this.reclamation.sousCategorieIncident === 'AUTRE' &&
      !this.reclamation.detailsAutreIncident?.trim()
    ) {
      this.errorMessage = this.translate.instant('reclamation_create.errors.incident_detail_required');
      return;
    }

    this.isSubmitting = true;

    this.reclamationService.createReclamation(this.reclamation, this.selectedFile || undefined).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.successMessage = this.translate.instant('reclamation_create.success_message');
        this.showSuccess = true;
        this.startCountdown();
      },
      error: (error) => {
        console.error(error);
        this.isSubmitting = false;
        this.errorMessage =
          error?.error?.message ||
          this.translate.instant('reclamation_create.errors.create_failed');
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/mes-reclamations']);
  }

  translateCategory(category: string): string {
    return this.translate.instant('reclamation_create.categories.' + category);
  }

  translatePriority(priority: string): string {
    return this.translate.instant('reclamation_create.priorities.' + priority);
  }

  translateMaintenanceType(type: string): string {
    return this.translate.instant('reclamation_create.maintenance_types.' + type);
  }

  translateIncidentCategory(category: string): string {
    return this.translate.instant('reclamation_create.incident_categories.' + category);
  }

  private startCountdown(): void {
    const interval = setInterval(() => {
      this.countdown--;

      if (this.countdown <= 0) {
        clearInterval(interval);
        this.router.navigate(['/mes-reclamations']);
      }
    }, 1000);
  }
}
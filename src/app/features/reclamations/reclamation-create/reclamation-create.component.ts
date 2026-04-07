import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { ClientNavbarComponent } from '../../../layout/client-navbar/client-navbar';
import { SidebarComponent } from '../../../layout/sidebar/sidebar';
import { ReclamationService } from '../../../core/services/reclamation.service';
import { CreateReclamationRequest } from '../../../core/models/reclamation.model';

@Component({
  selector: 'app-reclamation-create',
  standalone: true,
  imports: [CommonModule, FormsModule, ClientNavbarComponent, SidebarComponent],
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
    detailsAutreIncident: ''
  };

  selectedFile: File | null = null;
  isSubmitting = false;
  showSuccess = false;
  countdown = 3;
  successMessage = '';
  errorMessage = '';

  constructor(
    private reclamationService: ReclamationService,
    private router: Router
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
      this.errorMessage = 'Le titre est obligatoire.';
      return;
    }

    if (!this.reclamation.description.trim()) {
      this.errorMessage = 'La description est obligatoire.';
      return;
    }

    if (this.reclamation.categorie === 'MAINTENANCE' && !this.reclamation.typeMaintenance) {
      this.errorMessage = 'Veuillez sélectionner le type de maintenance.';
      return;
    }

    if (
      this.reclamation.categorie === 'MAINTENANCE' &&
      this.reclamation.typeMaintenance === 'INCIDENT' &&
      !this.reclamation.sousCategorieIncident
    ) {
      this.errorMessage = 'Veuillez sélectionner le domaine de l’incident.';
      return;
    }

    if (
      this.reclamation.categorie === 'MAINTENANCE' &&
      this.reclamation.typeMaintenance === 'INCIDENT' &&
      this.reclamation.sousCategorieIncident === 'AUTRE' &&
      !this.reclamation.detailsAutreIncident?.trim()
    ) {
      this.errorMessage = 'Veuillez préciser le détail de l’incident.';
      return;
    }

    this.isSubmitting = true;

    this.reclamationService.createReclamation(this.reclamation, this.selectedFile || undefined).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.successMessage = 'Réclamation créée avec succès.';
        this.showSuccess = true;
        this.startCountdown();
      },
      error: (error) => {
        console.error(error);
        this.isSubmitting = false;
        this.errorMessage =
          error?.error?.message || 'Une erreur est survenue lors de la création de la réclamation.';
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/mes-reclamations']);
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
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ReclamationService } from '../../../core/services/reclamation.service';
import { CreateReclamationRequest } from '../../../core/models/reclamation.model';
import { ClientNavbarComponent } from '../../../layout/client-navbar/client-navbar';
import { SidebarComponent } from '../../../layout/sidebar/sidebar';

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
    typeMaintenance: undefined
  };

  selectedFile: File | null = null;

  isSubmitting = false;
  showSuccess = false;
  countdown = 3;

  successMessage: string = '';
  errorMessage: string = '';

  constructor(
    private reclamationService: ReclamationService,
    private router: Router
  ) {}

  onFileSelected(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      this.selectedFile = event.target.files[0];
    }
  }

  onSubmit(): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (!this.reclamation.titre || !this.reclamation.description || !this.reclamation.categorie || !this.reclamation.priorite) {
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }

    if (this.reclamation.categorie === 'MAINTENANCE' && !this.reclamation.typeMaintenance) {
      this.errorMessage = 'Veuillez choisir le type de maintenance.';
      return;
    }

    if (this.reclamation.typeMaintenance === 'INCIDENT') {
      if (!this.reclamation.sousCategorieIncident) {
        this.errorMessage = 'Veuillez choisir le domaine technique de l\'incident.';
        return;
      }
      if (this.reclamation.sousCategorieIncident === 'AUTRE' && !this.reclamation.detailsAutreIncident) {
        this.errorMessage = 'Veuillez préciser le détail de l\'incident (Autre).';
        return;
      }
    }

    this.isSubmitting = true;

    this.reclamationService.createReclamation(this.reclamation, this.selectedFile || undefined).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.showSuccess = true;
        this.successMessage =
          "Votre réclamation a été enregistrée avec succès. Un accusé de réception a été envoyé à votre adresse email.";
        this.errorMessage = '';
        this.startCountdown();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.showSuccess = false;
        this.successMessage = '';
        this.errorMessage =
          "Erreur serveur lors de la création de la réclamation.";
        console.error('Erreur lors de la création', err);
      }
    });
  }

  private startCountdown(): void {
    this.countdown = 3;

    const interval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(interval);
        this.router.navigate(['/mes-reclamations']);
      }
    }, 1000);
  }

  cancel(): void {
    this.router.navigate(['/mes-reclamations']);
  }
}
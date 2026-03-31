import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ReclamationService } from '../../../core/services/reclamation.service';
import { CreateReclamationRequest } from '../../../core/models/reclamation.model';
import { ClientNavbarComponent } from '../../../layout/client-navbar/client-navbar';

@Component({
  selector: 'app-reclamation-create',
  standalone: true,
  imports: [CommonModule, FormsModule, ClientNavbarComponent],
  templateUrl: './reclamation-create.component.html',
  styleUrls: ['./reclamation-create.component.css']
})
export class ReclamationCreateComponent {
  reclamation: CreateReclamationRequest = {
    titre: '',
    description: '',
    categorie: 'TECHNIQUE',
    priorite: 'MOYENNE'
  };

  isSubmitting = false;
  showSuccess = false;
  countdown = 3;

  successMessage: string = '';
  errorMessage: string = '';

  constructor(
    private reclamationService: ReclamationService,
    private router: Router
  ) {}

  onSubmit(): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (!this.reclamation.titre || !this.reclamation.description) {
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }

    this.isSubmitting = true;

    this.reclamationService.createReclamation(this.reclamation).subscribe({
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
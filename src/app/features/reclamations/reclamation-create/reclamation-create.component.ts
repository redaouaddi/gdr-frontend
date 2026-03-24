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

  constructor(
    private reclamationService: ReclamationService,
    private router: Router
  ) {}

  onSubmit(): void {
    if (!this.reclamation.titre || !this.reclamation.description) {
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    
    this.isSubmitting = true;
    this.reclamationService.createReclamation(this.reclamation).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.showSuccess = true;
        this.startCountdown();
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Erreur lors de la création', err);
        alert('Erreur serveur lors de la création de la réclamation.');
      }
    });
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

  cancel(): void {
    this.router.navigate(['/mes-reclamations']);
  }
}

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReclamationService } from '../../../core/services/reclamation.service';
import { Reclamation } from '../../../core/models/reclamation.model';
import { NavbarComponent } from '../../../layout/navbar/navbar';
import { SidebarComponent } from '../../../layout/sidebar/sidebar';
import { finalize, timeout } from 'rxjs/operators';

@Component({
  selector: 'app-all-reclamations',
  standalone: true,
  imports: [CommonModule, NavbarComponent, SidebarComponent],
  templateUrl: './all-reclamations.component.html'
})
export class AllReclamationsComponent implements OnInit {
  reclamations: Reclamation[] = [];
  isLoading = true;

  errorMessage = '';

  constructor(private reclamationService: ReclamationService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadReclamations();
  }

  loadReclamations(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.reclamationService.getAllReclamations()
    .pipe(
      timeout(15000),
      finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      })
    )
    .subscribe({
      next: (data) => {
        this.reclamations = data;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des réclamations', err);
        this.errorMessage = 'Le serveur met trop de temps à répondre ou est inaccessible.';
      }
    });
  }

  getBadgeClass(statut: string): string {
    switch (statut) {
      case 'EN_ATTENTE': return 'bg-warning text-dark';
      case 'OUVERTE': return 'bg-info text-dark';
      case 'EN_COURS': return 'bg-primary';
      case 'RESOLUE': return 'bg-success';
      case 'REJETEE': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  getPriorityClass(priorite: string): string {
    switch (priorite) {
      case 'HAUTE':
      case 'URGENTE': return 'bg-danger bg-opacity-10 text-danger border border-danger';
      case 'MOYENNE': return 'bg-warning bg-opacity-10 text-warning border border-warning';
      case 'BASSE': return 'bg-success bg-opacity-10 text-success border border-success';
      default: return 'bg-light text-dark';
    }
  }
}

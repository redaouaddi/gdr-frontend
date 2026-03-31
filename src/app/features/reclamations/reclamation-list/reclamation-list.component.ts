import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReclamationService } from '../../../core/services/reclamation.service';
import { Reclamation } from '../../../core/models/reclamation.model';
import { ClientNavbarComponent } from '../../../layout/client-navbar/client-navbar';
import { SidebarComponent } from '../../../layout/sidebar/sidebar';

@Component({
  selector: 'app-reclamation-list',
  standalone: true,
  imports: [CommonModule, ClientNavbarComponent, SidebarComponent],
  templateUrl: './reclamation-list.component.html',
  styleUrls: ['./reclamation-list.component.css']
})
export class ReclamationListComponent implements OnInit {
  reclamations: Reclamation[] = [];

  constructor(
    private reclamationService: ReclamationService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.reclamationService.getMyReclamations().subscribe({
      next: (data) => {
        console.log('RECLAMATIONS REÇUES DU BACKEND:', data);
        this.reclamations = data || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('ERREUR LORS DU CHARGEMENT DES RECLAMATIONS:', err);
        this.reclamations = [];
      }
    });
  }

  getStatusClass(statut: string): string {
    if (!statut) return 'status-pending';
    const s = statut.toLowerCase();
    if (s.includes('résol') || s.includes('resol')) return 'status-resolved';
    if (s.includes('rejet') || s.includes('rejet')) return 'status-rejected';
    if (s.includes('en cours') || s.includes('en_cours')) return 'status-progress';
    if (s.includes('attente') || s.includes('en_attente')) return 'status-pending';
    return 'status-pending';
  }

  onCreateReclamation(): void {
    this.router.navigate(['/mes-reclamations/nouvelle']);
  }
}

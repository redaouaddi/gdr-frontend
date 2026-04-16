import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReclamationService } from '../../../core/services/reclamation.service';
import { Reclamation } from '../../../core/models/reclamation.model';
import { Sidebar } from '../../../layout/sidebar/sidebar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Navbar } from '../../../layout/navbar/navbar';

@Component({
  selector: 'app-agent-missions',
  standalone: true,
  imports: [CommonModule, Sidebar, Navbar, TranslateModule],
  templateUrl: './agent-missions.html',
  styleUrls: ['./agent-missions.css']
})
export class AgentMissionsComponent implements OnInit {
  missions: Reclamation[] = [];
  loading = true;

  constructor(
    private reclamationService: ReclamationService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadMissions();
  }

  loadMissions(): void {
    this.loading = true;
    this.reclamationService.getMesMissions().subscribe({
      next: (data) => {
        this.missions = data || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('AGENT MISSIONS - ERREUR:', err);
        this.missions = [];
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getStatusClass(statut: string): string {
    if (!statut) return 'status-pending';
    const s = statut.toLowerCase();
    if (s.includes('résol') || s.includes('resol') || s.includes('traitee')) return 'status-resolved';
    if (s.includes('rejet')) return 'status-rejected';
    if (s.includes('en cours') || s.includes('en_cours')) return 'status-progress';
    if (s.includes('attente') || s.includes('en_attente')) return 'status-pending';
    return 'status-pending';
  }

  translateStatus(statut: string | undefined): string {
    if (!statut) return '';
    return this.translate.instant('status.' + statut);
  }

  translateCategory(categorie: string | undefined): string {
    if (!categorie) return '';
    return this.translate.instant('categories.' + categorie);
  }

  getPriorityClass(priority: string): string {
    if (!priority) return '';
    switch (priority.toUpperCase()) {
      case 'ELEVEE':
      case 'HAUTE':
      case 'URGENTE':
        return 'priority-high';
      case 'MOYENNE':
        return 'priority-medium';
      case 'FAIBLE':
      case 'BASSE':
        return 'priority-low';
      default:
        return '';
    }
  }
}

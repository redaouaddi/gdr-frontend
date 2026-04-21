import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReclamationService } from '../../../core/services/reclamation.service';
import { Reclamation } from '../../../core/models/reclamation.model';
import { Navbar } from '../../../layout/navbar/navbar';
import { Sidebar } from '../../../layout/sidebar/sidebar';
import { finalize, timeout } from 'rxjs/operators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-all-reclamations',
  standalone: true,
  imports: [
    CommonModule,
    Navbar,
    Sidebar,
    TranslateModule
  ],
  templateUrl: './all-reclamations.component.html'
})
export class AllReclamationsComponent implements OnInit {

  reclamations: Reclamation[] = [];
  isLoading = true;
  errorMessage = '';

  constructor(
    private reclamationService: ReclamationService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService
  ) {}

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
          this.errorMessage = this.translate.instant('reclamations_all.server_error');
        }
      });
  }

  translateStatus(statut: string): string {
    return this.translate.instant('status.' + statut);
  }

  translatePriority(priorite: string): string {
    return this.translate.instant('priority.' + priorite);
  }

  translateSlaStatus(slaStatus?: string): string {
    if (!slaStatus) {
      return '-';
    }
    return this.translate.instant('sla_status.' + slaStatus);
  }

  getBadgeClass(statut: string): string {
    switch (statut) {
      case 'EN_ATTENTE':
        return 'bg-warning text-dark';
      case 'EN_COURS':
        return 'bg-primary';
      case 'TRAITEE':
        return 'bg-success';
      case 'REJETEE':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  }

  getPriorityClass(priorite: string): string {
    switch (priorite) {
      case 'ELEVEE':
        return 'bg-danger bg-opacity-10 text-danger border border-danger';
      case 'MOYENNE':
        return 'bg-warning bg-opacity-10 text-warning border border-warning';
      case 'FAIBLE':
        return 'bg-success bg-opacity-10 text-success border border-success';
      default:
        return 'bg-light text-dark';
    }
  }

  getSlaClass(slaStatus?: string): string {
    switch (slaStatus) {
      case 'EN_COURS':
        return 'bg-success bg-opacity-10 text-success border border-success';
      case 'PROCHE_DEPASSEMENT':
        return 'bg-warning bg-opacity-10 text-warning border border-warning';
      case 'DEPASSE':
        return 'bg-danger bg-opacity-10 text-danger border border-danger';
      case 'RESPECTE':
        return 'bg-info bg-opacity-10 text-info border border-info';
      default:
        return 'bg-light text-dark';
    }
  }

  formatDate(date?: string | Date | null): string {
    if (!date) {
      return '-';
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return '-';
    }

    return parsedDate.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getRemainingTime(deadline?: string | Date | null, slaStatus?: string): string {
    if (!deadline) {
      return '-';
    }

    if (slaStatus === 'DEPASSE') {
      return this.translate.instant('sla.expired');
    }

    if (slaStatus === 'RESPECTE') {
      return this.translate.instant('sla.respected');
    }

    const now = new Date().getTime();
    const end = new Date(deadline).getTime();

    if (isNaN(end)) {
      return '-';
    }

    const diffMs = end - now;

    if (diffMs <= 0) {
      return this.translate.instant('sla.expired');
    }

    const totalMinutes = Math.floor(diffMs / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) {
      return `${days}j ${hours}h ${minutes}min`;
    }

    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }

    return `${minutes} min`;
  }
}
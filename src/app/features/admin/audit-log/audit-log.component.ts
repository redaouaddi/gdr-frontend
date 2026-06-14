import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { Navbar } from '../../../layout/navbar/navbar';
import { Sidebar } from '../../../layout/sidebar/sidebar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuditService } from '../../../core/services/audit.service';
import { AuditLog } from '../../../core/models/audit-log.model';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar, Sidebar, TranslateModule],
  templateUrl: './audit-log.component.html',
  styleUrls: ['./audit-log.component.css']
})
export class AuditLogComponent implements OnInit {
  logs: AuditLog[] = [];
  isLoading = false;
  errorMessage = '';

  filterRole = '';
  filterUser = '';
  filterAction = '';
  filterStartDate = '';
  filterEndDate = '';
  filterSearch = '';
  hideConsultations = true;

  currentPage = 0;
  pageSize = 20;
  totalElements = 0;
  totalPages = 0;

  readonly roleOptions = [
    'ADMIN',
    'SERVICE_MANAGER',
    'CHEF_EQUIPE',
    'AGENT',
    'CLIENT',
    'USER'
  ];

  constructor(
    private auditService: AuditService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.auditService
      .getAuditLogs(
        this.currentPage,
        this.pageSize,
        this.filterRole || undefined,
        this.filterUser || undefined,
        this.filterAction || undefined,
        this.filterStartDate || undefined,
        this.filterEndDate || undefined,
        this.filterSearch || undefined,
        this.hideConsultations
      )
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.logs = response.content || [];
          this.totalElements = response.totalElements ?? this.logs.length;
          this.totalPages = response.totalPages ?? 1;
        },
        error: (err) => {
          console.error('Erreur chargement audit', err);
          this.logs = [];
          const backendMsg =
            typeof err?.error === 'string'
              ? err.error
              : err?.error?.message;
          this.errorMessage =
            backendMsg || this.translate.instant('audit_log.server_error');
        }
      });
  }

  applyFilters(): void {
    this.currentPage = 0;
    this.loadLogs();
  }

  clearFilters(): void {
    this.filterRole = '';
    this.filterUser = '';
    this.filterAction = '';
    this.filterStartDate = '';
    this.filterEndDate = '';
    this.filterSearch = '';
    this.hideConsultations = true;
    this.currentPage = 0;
    this.loadLogs();
  }

  exportExcel(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.auditService
      .exportExcel(
        this.filterRole || undefined,
        this.filterUser || undefined,
        this.filterAction || undefined,
        this.filterStartDate || undefined,
        this.filterEndDate || undefined,
        this.filterSearch || undefined,
        this.hideConsultations
      )
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `journal-audit-${new Date().toISOString().substring(0, 10)}.xlsx`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        },
        error: (err) => {
          console.error('Erreur export Excel', err);
          this.errorMessage = this.translate.instant('audit_log.export_error') || 'Erreur lors de l\'export Excel';
        }
      });
  }

  exportPdf(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.auditService
      .exportPdf(
        this.filterRole || undefined,
        this.filterUser || undefined,
        this.filterAction || undefined,
        this.filterStartDate || undefined,
        this.filterEndDate || undefined,
        this.filterSearch || undefined,
        this.hideConsultations
      )
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `journal-audit-${new Date().toISOString().substring(0, 10)}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        },
        error: (err) => {
          console.error('Erreur export PDF', err);
          this.errorMessage = this.translate.instant('audit_log.export_error') || 'Erreur lors de l\'export PDF';
        }
      });
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadLogs();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.onPageChange(this.currentPage + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage > 0) {
      this.onPageChange(this.currentPage - 1);
    }
  }

  formatDateTime(value?: string): string {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return value;
    }
  }

  getRoleBadgeClass(role: string): string {
    const map: Record<string, string> = {
      ADMIN: 'bg-danger-subtle text-danger',
      SERVICE_MANAGER: 'bg-primary-subtle text-primary',
      CHEF_EQUIPE: 'bg-info-subtle text-info',
      AGENT: 'bg-secondary-subtle text-secondary',
      CLIENT: 'bg-success-subtle text-success',
      USER: 'bg-success-subtle text-success'
    };
    return map[role?.toUpperCase()] || 'bg-light text-dark';
  }

  translateRole(role: string): string {
    const key = `audit_log.roles.${role?.toUpperCase()}`;
    const translated = this.translate.instant(key);
    return translated !== key ? translated : role;
  }

  /** Returns true if the action represents a failed operation (prefixed with ECHEC_) */
  isFailedAction(action: string): boolean {
    return action?.startsWith('ECHEC_') || false;
  }

  /** Returns a CSS class for colouring the action status badge */
  getActionBadgeClass(action: string): string {
    return this.isFailedAction(action)
      ? 'audit-action-badge audit-action-badge--error'
      : 'audit-action-badge audit-action-badge--success';
  }

  /**
   * Returns a human-readable label for the action code.
   * Falls back to humanizing the raw code (remove ECHEC_ prefix + replace underscores).
   */
  getActionLabel(action: string): string {
    if (!action) return '—';
    const key = `audit_log.actions.${action}`;
    const translated = this.translate.instant(key);
    if (translated !== key) return translated;
    // Humanize raw code as last resort
    const base = action.startsWith('ECHEC_') ? action.substring(6) : action;
    return base.replace(/_/g, ' ');
  }

  /**
   * Filters and formats raw HTTP technical details to clean business phrases.
   */
  sanitizeDetails(log: AuditLog): string {
    const details = log.details;
    if (!details || !details.trim()) return '—';

    const isRawHttp =
      /^(Succes|Echec)\s+HTTP\s+(GET|POST|PUT|PATCH|DELETE)/i.test(details) ||
      /- statut \d{3}$/.test(details.trim());
    if (!isRawHttp) return details;

    const action = log.action || '';
    const entityId = log.entityId || '';
    const failed = action.startsWith('ECHEC_');
    const baseAction = failed ? action.substring(6) : action;

    let description = '';
    switch (baseAction) {
      case 'CONNEXION':
        description = 'Connexion au système';
        break;
      case 'CONNEXION_FACIALE':
        description = 'Connexion par reconnaissance faciale';
        break;
      case 'ENREGISTREMENT_VISAGE':
        description = 'Enregistrement du visage (Face ID)';
        break;
      case 'DEMANDE_ENREGISTREMENT_PASSKEY':
        description = "Demande d'enregistrement d'une clé de sécurité (Passkey)";
        break;
      case 'ENREGISTREMENT_PASSKEY':
        description = 'Clé de sécurité (Passkey) enregistrée';
        break;
      case 'CREATION_RECLAMATION':
        description = 'Nouvelle réclamation créée';
        break;
      case 'MODIFICATION_RECLAMATION':
        description = `Réclamation${entityId ? ' #' + entityId : ''} modifiée`;
        break;
      case 'SUPPRESSION_RECLAMATION':
        description = `Réclamation${entityId ? ' #' + entityId : ''} supprimée`;
        break;
      case 'ASSIGNATION_RECLAMATION':
        description = `Réclamation${entityId ? ' #' + entityId : ''} assignée à une équipe`;
        break;
      case 'REJET_RECLAMATION':
        description = `Réclamation${entityId ? ' #' + entityId : ''} rejetée`;
        break;
      case 'ACCEPTATION_RECLAMATION':
        description = `Réclamation${entityId ? ' #' + entityId : ''} acceptée et mise en cours`;
        break;
      case 'RESOLUTION_RECLAMATION':
        description = `Réclamation${entityId ? ' #' + entityId : ''} marquée comme résolue`;
        break;
      case 'REOUVERTURE_RECLAMATION':
        description = `Réclamation${entityId ? ' #' + entityId : ''} réouverte`;
        break;
      case 'TELECHARGEMENT_PIECE_JOINTE':
        description = `Pièce jointe de la réclamation${entityId ? ' #' + entityId : ''} téléchargée`;
        break;
      case 'CREATION_UTILISATEUR':
        description = `Nouveau compte utilisateur créé${entityId ? ' (' + entityId + ')' : ''}`;
        break;
      case 'MODIFICATION_UTILISATEUR':
        description = `Informations de l'utilisateur${entityId ? ' ' + entityId : ''} modifiées`;
        break;
      case 'SUPPRESSION_UTILISATEUR':
        description = `Compte utilisateur${entityId ? ' ' + entityId : ''} supprimé`;
        break;
      case 'MODIFICATION_ROLES_UTILISATEUR':
        description = `Rôles et permissions de l'utilisateur${entityId ? ' ' + entityId : ''} mis à jour`;
        break;
      case 'CREATION_EQUIPE':
        description = 'Nouvelle équipe créée';
        break;
      case 'MODIFICATION_EQUIPE':
        description = `Équipe${entityId ? ' ' + entityId : ''} modifiée`;
        break;
      case 'SUPPRESSION_EQUIPE':
        description = `Équipe${entityId ? ' ' + entityId : ''} supprimée`;
        break;
      case 'AJOUT_AGENT_EQUIPE':
        description = `Agent ajouté à l'équipe${entityId ? ' ' + entityId : ''}`;
        break;
      case 'RETRAIT_AGENT_EQUIPE':
        description = `Agent retiré de l'équipe${entityId ? ' ' + entityId : ''}`;
        break;
      case 'CREATION_ROLE':
        description = 'Nouveau rôle créé';
        break;
      case 'MODIFICATION_ROLE':
        description = `Rôle${entityId ? ' ' + entityId : ''} modifié`;
        break;
      case 'SUPPRESSION_ROLE':
        description = `Rôle${entityId ? ' ' + entityId : ''} supprimé`;
        break;
      case 'ENVOI_MESSAGE_INTERNE':
        description = 'Message interne envoyé';
        break;
      case 'ENVOI_MESSAGE_INTERNE_FICHIER':
        description = 'Message interne avec pièce jointe envoyé';
        break;
      case 'CREATION_SLA':
        description = 'Paramètres SLA créés';
        break;
      case 'MODIFICATION_SLA':
        description = 'Paramètres SLA mis à jour';
        break;
      case 'QUESTION_CHATBOT':
        description = "Consultation de l'assistant virtuel (chatbot)";
        break;
      case 'CONSULTATION_DASHBOARD':
        description = 'Consultation du tableau de bord';
        break;
      default:
        description = baseAction
          .replace('CREATION_', 'Création de ')
          .replace('MODIFICATION_', 'Modification de ')
          .replace('SUPPRESSION_', 'Suppression de ')
          .replace('CONSULTATION_', 'Consultation de ')
          .replace(/_/g, ' ')
          .toLowerCase();
        if (description.length > 0) {
          description = description.charAt(0).toUpperCase() + description.slice(1);
        } else {
          description = details;
        }
        break;
    }

    return failed ? `${description} — Échec` : `${description} — Succès`;
  }
}

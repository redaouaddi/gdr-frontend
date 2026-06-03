import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReclamationService } from '../../../core/services/reclamation.service';
import { EquipeService } from '../../../core/services/equipe.service';
import { Reclamation } from '../../../core/models/reclamation.model';
import { Equipe } from '../../../core/models/equipe.model';
import { finalize, timeout } from 'rxjs/operators';
import { Navbar } from '../../../layout/navbar/navbar';
import { Sidebar } from '../../../layout/sidebar/sidebar';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MessageInterneService, MessageInterne } from '../../../core/services/message-interne.service';
import { DatePipe } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-service-manager-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar, Sidebar, TranslateModule, DatePipe, BaseChartDirective],
  templateUrl: './service-manager-dashboard.component.html',
  styleUrls: ['./service-manager-dashboard.component.css']
})
export class ServiceManagerDashboardComponent implements OnInit {
  reclamations: Reclamation[] = [];
  equipes: Equipe[] = [];

  activeView: 'stats' | 'list' = 'stats';

  stats = {
    total: 0,
    attente: 0,
    encours: 0,
    resolues: 0,
    rejetees: 0,
    reouvertes: 0
  };

  // --- Chart Data ---
  public statusChartType: ChartType = 'doughnut';
  public statusChartData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  public statusChartOptions: ChartConfiguration['options'] = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } };

  public slaChartType: ChartType = 'pie';
  public slaChartData: ChartData<'pie'> = { labels: [], datasets: [] };
  public slaChartOptions: ChartConfiguration['options'] = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } };

  public teamChartType: ChartType = 'bar';
  public teamChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  public teamChartOptions: ChartConfiguration['options'] = { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } };

  public priorityChartType: ChartType = 'bar';
  public priorityChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  public priorityChartOptions: ChartConfiguration['options'] = { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, plugins: { legend: { display: false } } };

  public categoryChartType: ChartType = 'pie';
  public categoryChartData: ChartData<'pie'> = { labels: [], datasets: [] };
  public categoryChartOptions: ChartConfiguration['options'] = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } };

  isLoading = true;
  errorMessage = '';

  // Pagination for list view
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  selectedReclamation: Reclamation | null = null;
  selectedEquipeId: number | null = null;
  teamSearchTerm = '';
  selectedStatusFilter = '';
  isAssigning = false;

  // Internal Remarks state
  showNoteModal = false;
  currentMissionNotes: MessageInterne[] = [];
  newNoteText = '';
  selectedMissionNoteId?: number;
  selectedMissionNoteNumero?: string;
  isSendingNote = false;
  isLoadingNotes = false;

  // Pagination for notes
  notesCurrentPage = 0;
  notesPageSize = 10;
  notesTotalElements = 0;
  notesTotalPages = 0;

  // Details Modal state
  showDetailsModal = false;
  selectedDetails: Reclamation | null = null;

  get filteredEquipes(): Equipe[] {
    if (!this.teamSearchTerm.trim()) return this.equipes;
    return this.equipes.filter(e =>
      e.nom.toLowerCase().includes(this.teamSearchTerm.toLowerCase())
    );
  }

  constructor(
    private reclamationService: ReclamationService,
    private equipeService: EquipeService,
    private messageInterneService: MessageInterneService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['view'] === 'list') {
        this.activeView = 'list';
      } else {
        this.activeView = 'stats';
      }
    });
    this.initialLoad();
  }

  selectEquipe(id: number | undefined): void {
    if (id !== undefined) {
      this.selectedEquipeId = id;
    }
  }

  initialLoad(): void {
    this.isLoading = true;
    this.loadData();
  }

  loadData(): void {
    this.errorMessage = '';
    this.reclamations = []; // Clear current list to avoid showing old data while loading
    this.cdr.detectChanges();

    // Fetch teams (large size for selection)
    this.equipeService.getAllTeams(0, 1000)
      .pipe(timeout(15000))
      .subscribe({
        next: (response) => this.equipes = response.content || [],
        error: (err) => console.error('Erreur chargement équipes', err)
      });

    // Fetch reclamations (current page for list, but also used for stats)
    // NOTE: For accurate stats, we might need a separate call or fetch all.
    // Given the previous logic, I'll fetch with pageSize for the list.
    this.reclamationService.getAllReclamations(this.currentPage, this.pageSize, this.selectedStatusFilter || undefined)
      .pipe(
        timeout(15000),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.reclamations = response.content || [];
          this.totalElements = response.totalElements;
          this.totalPages = response.totalPages;

          // Stats calculation (warning: only based on current page if not fetching all)
          // Ideally the backend should provide stats.
          const data = this.reclamations;
          this.stats = {
            total: response.totalElements,
            attente: data.filter(r => r.statut === 'EN_ATTENTE').length, // This is incorrect if only fetching 1 page
            encours: data.filter(r => r.statut === 'EN_COURS').length,
            resolues: data.filter(r => r.statut === 'TRAITEE').length,
            rejetees: data.filter(r => r.statut === 'REJETEE').length,
            reouvertes: data.filter(r => r.statut === 'REOUVERTE').length
          };
          this.updateCharts(data);
        },
        error: (err) => {
          console.error('Erreur chargement réclamations', err);
          this.errorMessage = this.translate.instant('service_manager.errors.server_error');
        }
      });
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadData();
  }

  setStatusFilter(status: string): void {
    this.selectedStatusFilter = status;
    this.currentPage = 0;
    this.loadData();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadData();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadData();
    }
  }

  openDetailsModal(rec: Reclamation): void {
    this.selectedDetails = rec;
    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    this.selectedDetails = null;
    this.showDetailsModal = false;
  }

  downloadReouvertureFile(rec: Reclamation): void {
    if (!rec || !rec.reouvertureAttachmentName) return;
    this.reclamationService.downloadReouvertureAttachment(rec.numeroReclamation).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = rec.reouvertureAttachmentName || 'piece-jointe-reouverture';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Erreur lors du téléchargement de la pièce jointe', err);
      }
    });
  }

  openAssignModal(rec: Reclamation): void {
    this.selectedReclamation = rec;
    this.selectedEquipeId = null;
    this.errorMessage = '';
  }

  closeAssignModal(): void {
    this.selectedReclamation = null;
    this.selectedEquipeId = null;
    this.teamSearchTerm = '';
  }

  confirmAssign(): void {
    if (!this.selectedReclamation || !this.selectedEquipeId) return;

    this.isAssigning = true;
    this.reclamationService.assignerEquipe(this.selectedReclamation.numeroReclamation, this.selectedEquipeId)
      .pipe(finalize(() => this.isAssigning = false))
      .subscribe({
        next: () => {
          this.closeAssignModal();
          this.loadData();
        },
        error: (err) => {
          console.error("Erreur d'assignation", err);
          this.errorMessage = this.translate.instant('service_manager.errors.assign_failed');
        }
      });
  }

  updateCharts(data: Reclamation[]): void {
    // 1. Status Chart
    this.statusChartData = {
      labels: [
        this.translate.instant('status.EN_ATTENTE'),
        this.translate.instant('status.EN_COURS'),
        this.translate.instant('status.TRAITEE'),
        this.translate.instant('status.REJETEE'),
        this.translate.instant('status.REOUVERTE')
      ],
      datasets: [{
        data: [
          this.stats.attente,
          this.stats.encours,
          this.stats.resolues,
          this.stats.rejetees,
          this.stats.reouvertes
        ],
        backgroundColor: ['#ffc107', '#0d6efd', '#198754', '#dc3545', '#0dcaf0']
      }]
    };

    // 2. SLA Chart
    const slaRespecte = data.filter(r => r.slaStatus === 'RESPECTE').length;
    const slaEnCours = data.filter(r => r.slaStatus === 'EN_COURS' || (!r.slaStatus && r.statut !== 'TRAITEE' && r.statut !== 'REJETEE')).length;
    const slaProche = data.filter(r => r.slaStatus === 'PROCHE_DEPASSEMENT').length;
    const slaDepasse = data.filter(r => r.slaStatus === 'DEPASSE').length;

    this.slaChartData = {
      labels: [
        this.translate.instant('sla_status.RESPECTE'),
        this.translate.instant('sla_status.EN_COURS'),
        this.translate.instant('sla_status.PROCHE_DEPASSEMENT'),
        this.translate.instant('sla_status.DEPASSE')
      ],
      datasets: [{
        data: [slaRespecte, slaEnCours, slaProche, slaDepasse],
        backgroundColor: ['#20c997', '#0dcaf0', '#fd7e14', '#dc3545']
      }]
    };

    // 3. Team Chart
    const teamCounts: { [key: string]: number } = {};
    data.forEach(r => {
      if (r.statut !== 'TRAITEE' && r.statut !== 'REJETEE') {
        const team = r.equipeAssignee || this.translate.instant('service_manager.unassigned');
        teamCounts[team] = (teamCounts[team] || 0) + 1;
      }
    });

    this.teamChartData = {
      labels: Object.keys(teamCounts),
      datasets: [{
        label: this.translate.instant('admin_dashboard.agents.workload.title'),
        data: Object.values(teamCounts),
        backgroundColor: '#6f42c1',
        borderRadius: 4
      }]
    };

    // 4. Priority Chart
    const prioElevee = data.filter(r => r.priorite === 'ELEVEE' && r.statut !== 'TRAITEE' && r.statut !== 'REJETEE').length;
    const prioMoy = data.filter(r => r.priorite === 'MOYENNE' && r.statut !== 'TRAITEE' && r.statut !== 'REJETEE').length;
    const prioFaible = data.filter(r => r.priorite === 'FAIBLE' && r.statut !== 'TRAITEE' && r.statut !== 'REJETEE').length;

    this.priorityChartData = {
      labels: [
        this.translate.instant('priority.ELEVEE'),
        this.translate.instant('priority.MOYENNE'),
        this.translate.instant('priority.FAIBLE')
      ],
      datasets: [{
        label: this.translate.instant('admin_dashboard.chart.labels.priority'),
        data: [prioElevee, prioMoy, prioFaible],
        backgroundColor: ['#dc3545', '#ffc107', '#0dcaf0'],
        borderRadius: 4
      }]
    };

    // 5. Category Chart
    const projCount = data.filter(r => r.categorie === 'PROJET').length;
    const maintCount = data.filter(r => r.categorie === 'MAINTENANCE').length;

    this.categoryChartData = {
      labels: [
        this.translate.instant('categories.PROJET'),
        this.translate.instant('categories.MAINTENANCE')
      ],
      datasets: [{
        data: [projCount, maintCount],
        backgroundColor: ['#6f42c1', '#fd7e14']
      }]
    };
  }

  translateStatus(statut: string | undefined): string {
    if (!statut) return '';
    return this.translate.instant('status.' + statut);
  }

  translatePriority(priorite: string | undefined): string {
    if (!priorite) return this.translate.instant('service_manager.undefined_priority');
    return this.translate.instant('priority.' + priorite);
  }

  translateCategory(categorie: string | undefined): string {
    if (!categorie) return '';
    return this.translate.instant('categories.' + categorie);
  }

  // Remark Modal Methods
  openNoteModal(mission: Reclamation): void {
    if (!mission.id) return;
    this.selectedMissionNoteId = mission.id;
    this.selectedMissionNoteNumero = mission.numeroReclamation;
    this.newNoteText = '';
    this.showNoteModal = true;
    this.notesCurrentPage = 0;
    this.loadNotes(mission.id);
  }

  closeNoteModal(): void {
    this.showNoteModal = false;
    this.selectedMissionNoteId = undefined;
    this.selectedMissionNoteNumero = undefined;
    this.currentMissionNotes = [];
  }

  loadNotes(reclamationId: number): void {
    this.isLoadingNotes = true;
    this.messageInterneService.getMessages(reclamationId, this.notesCurrentPage, this.notesPageSize).subscribe({
      next: (response) => {
        this.currentMissionNotes = response.content || [];
        this.notesTotalElements = response.totalElements;
        this.notesTotalPages = response.totalPages;
        this.isLoadingNotes = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur chargement notes:', err);
        this.isLoadingNotes = false;
        this.cdr.detectChanges();
      }
    });
  }

  onNotesPageChange(page: number): void {
    this.notesCurrentPage = page;
    if (this.selectedMissionNoteId) {
      this.loadNotes(this.selectedMissionNoteId);
    }
  }

  ajouterNote(): void {
    if (!this.selectedMissionNoteId || !this.newNoteText.trim()) return;

    this.isSendingNote = true;
    this.messageInterneService.envoyerMessage(this.selectedMissionNoteId, this.newNoteText).subscribe({
      next: (note) => {
        this.currentMissionNotes.push(note);
        this.newNoteText = '';
        this.isSendingNote = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur envoi note:', err);
        this.isSendingNote = false;
        this.cdr.detectChanges();
      }
    });
  }

  async exportReport(): Promise<void> {
    this.reclamationService.getAllReclamations(0, 1000).subscribe({
      next: (response) => {
        const allRecs = response.content || [];
        const doc = new jsPDF();
        const dateStr = new Date().toLocaleDateString();
        const nowMs = Date.now();

        // 1. Calculs des Statistiques Demandées
        const total = allRecs.length;
        const projetCount = allRecs.filter(r => r.categorie === 'PROJET').length;
        const maintenanceCount = allRecs.filter(r => r.categorie === 'MAINTENANCE').length;
        
        // SLA : Dépassé
        const horsSlaRecs = allRecs.filter(r => 
          r.slaStatus === 'DEPASSE' || 
          (r.slaDeadline && new Date(r.slaDeadline).getTime() < nowMs && r.statut !== 'TRAITEE')
        );
        const horsSlaCount = horsSlaRecs.length;
        const slaRespectPercent = total > 0 ? Math.round(((total - horsSlaCount) / total) * 100) : 100;

        // Groupement par statut
        const attenteCount = allRecs.filter(r => r.statut === 'EN_ATTENTE').length;
        const enCoursCount = allRecs.filter(r => r.statut === 'EN_COURS').length;
        const resoluesCount = allRecs.filter(r => r.statut === 'TRAITEE').length;
        const rejeteesCount = allRecs.filter(r => r.statut === 'REJETEE').length;
        const reouvertesCount = allRecs.filter(r => r.statut === 'REOUVERTE').length;

        // Groupement par équipe
        const equipeCounts: { [key: string]: number } = {};
        allRecs.forEach(r => {
          const eq = r.equipeAssignee || 'Non assignée';
          equipeCounts[eq] = (equipeCounts[eq] || 0) + 1;
        });
        const equipeData = Object.keys(equipeCounts).map(eq => [eq, equipeCounts[eq].toString()]);

        // --- PAGE 1 : EN-TÊTE & STATISTIQUES GLOBAL ---
        doc.setFontSize(20);
        doc.setTextColor(74, 39, 105); // #4a2769
        doc.text('Rapport Global de Gestion des Réclamations (GDR)', 14, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Généré le : ${dateStr} | Rôle : Service Manager`, 14, 28);
        
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('1. Indicateurs Globaux & Répartition des Projets', 14, 40);
        
        autoTable(doc, {
          startY: 45,
          head: [['Indicateur', 'Nombre / Valeur']],
          body: [
            ['Total des Réclamations', total.toString()],
            ['Réclamations Catégorie : PROJET', projetCount.toString()],
            ['Réclamations Catégorie : MAINTENANCE', maintenanceCount.toString()],
            ['Réclamations Hors SLA (Dépassement)', horsSlaCount.toString()],
            ['Taux de respect du SLA', `${slaRespectPercent}%`]
          ],
          headStyles: { fillColor: [74, 39, 105] },
          theme: 'striped'
        });

        // 2. Répartition par Statut
        doc.setFontSize(14);
        doc.text('2. Répartition par Statut', 14, (doc as any).lastAutoTable.finalY + 15);

        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 20,
          head: [['Statut', 'Nombre']],
          body: [
            ['En attente de confirmation', attenteCount.toString()],
            ['En cours de traitement', enCoursCount.toString()],
            ['Traitées / Résolues', resoluesCount.toString()],
            ['Rejetées', rejeteesCount.toString()],
            ['Réouvertes', reouvertesCount.toString()]
          ],
          headStyles: { fillColor: [74, 39, 105] },
          theme: 'striped'
        });

        // --- PAGE 2 : CHARGE DES ÉQUIPES & ALERTES SLA ---
        doc.addPage();
        doc.setFontSize(14);
        doc.text('3. Répartition des Réclamations par Équipe', 14, 20);

        autoTable(doc, {
          startY: 25,
          head: [['Équipe Assignée', 'Nombre de Réclamations']],
          body: equipeData,
          headStyles: { fillColor: [74, 39, 105] },
          theme: 'striped'
        });

        // SLA Alert Table if any
        doc.setFontSize(14);
        doc.text('4. Détails des Réclamations Hors SLA', 14, (doc as any).lastAutoTable.finalY + 15);

        if (horsSlaCount > 0) {
          const horsSlaTableData = horsSlaRecs.map(r => [
            r.numeroReclamation,
            r.titre,
            r.priorite || 'MOYENNE',
            r.equipeAssignee || 'Non assignée',
            r.slaDeadline ? new Date(r.slaDeadline).toLocaleDateString() : 'Non spécifié'
          ]);

          autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 20,
            head: [['N° Réclamation', 'Sujet', 'Priorité', 'Équipe', 'Date Limite SLA']],
            body: horsSlaTableData,
            headStyles: { fillColor: [220, 38, 38] }, // Red for alerts
            theme: 'striped',
            styles: { fontSize: 8 }
          });
        } else {
          doc.setFontSize(10);
          doc.setTextColor(100);
          doc.text('Aucun dépassement de SLA à signaler actuellement.', 14, (doc as any).lastAutoTable.finalY + 22);
        }

        // --- PAGE 3 : EXTRACTION DÉTAILLÉE DES RÉCLAMATIONS ---
        doc.addPage();
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('5. Extraction Complète des Réclamations (Base de données)', 14, 20);

        const fullExtractData = allRecs.map(r => [
          r.numeroReclamation,
          r.titre,
          r.categorie,
          r.statut,
          r.priorite || 'MOYENNE',
          r.equipeAssignee || 'Non assignée',
          new Date(r.dateCreation).toLocaleDateString()
        ]);

        autoTable(doc, {
          startY: 25,
          head: [['Référence', 'Sujet', 'Catégorie', 'Statut', 'Priorité', 'Équipe', 'Date Création']],
          body: fullExtractData,
          headStyles: { fillColor: [74, 39, 105] },
          theme: 'striped',
          styles: { fontSize: 7.5 }
        });

        // Page Numbering Footer on all pages
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(`Page ${i} sur ${pageCount} | GDR System DXC`, 105, 285, { align: 'center' });
        }

        doc.save(`Rapport_GDR_Manager_${dateStr.replace(/\//g, '-')}.pdf`);
      },
      error: (err) => {
        console.error('Erreur lors de la génération du rapport PDF', err);
      }
    });
  }
}
import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ReclamationService } from '../../core/services/reclamation.service';
import { Reclamation } from '../../core/models/reclamation.model';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

import { Sidebar } from '../sidebar/sidebar';
import { Navbar } from '../navbar/navbar';
import {
  DashboardService,
  ChartData,
  DashboardStats
} from '../../core/services/dashboard.service';

Chart.register(...registerables);

interface AgentWorkload {
  name: string;
  tickets: number;
  level: string;
  levelClass: string;
  recommendation: string;
}

interface SlaBreach {
  numero: string;
  priorite: string;
  priorityClass: string;
  agent: string;
  deadline: string;
  delay: string;
  action: string;
}

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    Sidebar,
    Navbar
  ],
  templateUrl: './dashboard-admin.html',
  styleUrls: ['./dashboard-admin.css']
})
export class DashboardAdminComponent implements OnInit {

  /* ================= KPI DYNAMIQUES ================= */

  usersCount = 0;
  reclamationsCount = 0;
  enCoursCount = 0;
  slaRespecte = 0;

  /* ================= CHART ================= */

  selectedDataset: 'status' | 'priority' | 'month' | 'categorie' = 'status';

  chartType: 'bar' | 'line' | 'pie' | 'doughnut' = 'bar';

  selectedColor = '#2563eb';

  chartData: ChartData[] = [];

  chart: any = null;

  smartAgentReason = '';

  workflowStatus = '';

  /* ================= AGENT CHARGE ================= */

  agentWorkloads: AgentWorkload[] = [];

  mostLoadedAgent: AgentWorkload = {
    name: '',
    tickets: 0,
    level: '',
    levelClass: '',
    recommendation: ''
  };

  /* ================= AGENT SLA ================= */

  slaBreaches: SlaBreach[] = [];

  /* ================= REPORTING MENU ================= */

  reportMenuOpen = false;
  allReclamations: Reclamation[] = [];

  constructor(
    private dashboardService: DashboardService,
    private translate: TranslateService,
    private reclamationService: ReclamationService,
    private elRef: ElementRef
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.reportMenuOpen && !this.elRef.nativeElement.querySelector('.report-dropdown-wrapper')?.contains(event.target)) {
      this.reportMenuOpen = false;
    }
  }

  /* ================================================= */

  ngOnInit(): void {

    this.loadStats();

    this.initializeAgentsData();

    this.loadSelectedChartData();

    this.translate.onLangChange.subscribe(() => {
      this.initializeAgentsData();
      this.applySmartVisualizationAgent();
      this.renderChart();
    });
  }

  /* ================= KPI ================= */

  loadStats(): void {

    this.dashboardService.getDashboardStats().subscribe({
      next: (data: DashboardStats) => {
        this.usersCount = data.usersCount;
        this.reclamationsCount = data.reclamationsCount;
        this.enCoursCount = data.enCoursCount;
        this.slaRespecte = data.slaRespecte;
      },

      error: (err) => {
        console.error('Erreur chargement KPI dashboard :', err);
      }
    });
  }

  /* ================= INIT AGENTS ================= */

  initializeAgentsData(): void {

    this.workflowStatus = 'admin_dashboard.agents.workflow.no_blockage';

    this.agentWorkloads = [
      {
        name: 'agent1',
        tickets: 12,
        level: '',
        levelClass: '',
        recommendation: ''
      },
      {
        name: 'agent2',
        tickets: 6,
        level: '',
        levelClass: '',
        recommendation: ''
      },
      {
        name: 'agent3',
        tickets: 3,
        level: '',
        levelClass: '',
        recommendation: ''
      }
    ];

    this.analyzeAgentWorkload();

    this.slaBreaches = [
      {
        numero: 'REC-102',
        priorite: 'admin_dashboard.priorities.high',
        priorityClass: 'danger',
        agent: 'agent1',
        deadline: '28/04/2026 10:30',
        delay: '+45 min',
        action: 'admin_dashboard.sla_details.actions.remind_agent'
      },

      {
        numero: 'REC-108',
        priorite: 'admin_dashboard.priorities.medium',
        priorityClass: 'warning',
        agent: 'agent2',
        deadline: '28/04/2026 09:00',
        delay: '+2h',
        action: 'admin_dashboard.sla_details.actions.reassign'
      }
    ];
  }

  /* ================= AGENT CHARGE ================= */

  analyzeAgentWorkload(): void {

    this.agentWorkloads = this.agentWorkloads.map(agent => {

      if (agent.tickets >= 10) {
        return {
          ...agent,
          level: 'admin_dashboard.workload.levels.overloaded',
          levelClass: 'danger',
          recommendation: 'admin_dashboard.workload.recommendations.reassign'
        };
      }

      if (agent.tickets >= 6) {
        return {
          ...agent,
          level: 'admin_dashboard.workload.levels.busy',
          levelClass: 'warning',
          recommendation: 'admin_dashboard.workload.recommendations.monitor'
        };
      }

      return {
        ...agent,
        level: 'admin_dashboard.workload.levels.normal',
        levelClass: 'success',
        recommendation: 'admin_dashboard.workload.recommendations.available'
      };

    });

    this.mostLoadedAgent = this.agentWorkloads.reduce((max, agent) =>
      agent.tickets > max.tickets ? agent : max
    );
  }

  /* ================= CHART ================= */

  onDatasetChange(): void {
    this.loadSelectedChartData();
  }

  loadSelectedChartData(): void {

    if (this.selectedDataset === 'status') {

      this.dashboardService.getStatusChart().subscribe({
        next: (data) => {
          this.chartData = data;
          this.applySmartVisualizationAgent();
          this.renderChart();
        }
      });
    }

    else if (this.selectedDataset === 'priority') {

      this.dashboardService.getPrioriteChart().subscribe({
        next: (data) => {
          this.chartData = data;
          this.applySmartVisualizationAgent();
          this.renderChart();
        }
      });
    }

    else if (this.selectedDataset === 'month') {

      this.dashboardService.getMonthChart().subscribe({
        next: (data) => {
          this.chartData = data;
          this.applySmartVisualizationAgent();
          this.renderChart();
        }
      });
    }

    else if (this.selectedDataset === 'categorie') {

      this.dashboardService.getCategorieChart().subscribe({
        next: (data) => {
          this.chartData = data;
          this.applySmartVisualizationAgent();
          this.renderChart();
        }
      });
    }
  }

  applySmartVisualizationAgent(): void {

    const itemsCount = this.chartData.length;

    if (this.selectedDataset === 'month') {
      this.chartType = 'line';
      this.selectedColor = '#4f46e5';

      this.smartAgentReason = this.translate.instant(
        'admin_dashboard.agents.visualization.reasons.month'
      );
    }

    else if (this.selectedDataset === 'status') {
      this.chartType = itemsCount <= 5 ? 'doughnut' : 'bar';
      this.selectedColor = '#2563eb';

      this.smartAgentReason = this.translate.instant(
        'admin_dashboard.agents.visualization.reasons.status'
      );
    }

    else if (this.selectedDataset === 'priority') {
      this.chartType = 'bar';
      this.selectedColor = '#f59e0b';

      this.smartAgentReason = this.translate.instant(
        'admin_dashboard.agents.visualization.reasons.priority'
      );
    }

    else {
      this.chartType = 'bar';
      this.selectedColor = '#7c3aed';

      this.smartAgentReason = this.translate.instant(
        'admin_dashboard.agents.visualization.reasons.category'
      );
    }
  }

  renderChart(): void {

    const canvas =
      document.getElementById('claimsChart') as HTMLCanvasElement;

    if (!canvas) return;

    if (this.chart) {
      this.chart.destroy();
    }

    const labels = this.chartData.map(item => {
      if (this.selectedDataset === 'status') return this.translate.instant('status.' + item.label);
      if (this.selectedDataset === 'priority') return this.translate.instant('priority.' + item.label);
      if (this.selectedDataset === 'categorie') return this.translate.instant('categories.' + item.label);
      return item.label;
    });
    const values = this.chartData.map(item => item.value);

    this.chart = new Chart(canvas, {
      type: this.chartType,

      data: {
        labels: labels,

        datasets: [
          {
            label: this.getChartLabel(),
            data: values,
            backgroundColor: this.generateColors(values.length),
            borderColor: this.generateColors(values.length),
            borderWidth: 2,
            tension: 0.35,
            fill: this.chartType === 'line'
          }
        ]
      },

      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  generateColors(count: number): string[] {

    const palette = [
      '#2563eb',
      '#7c3aed',
      '#16a34a',
      '#f59e0b',
      '#dc2626',
      '#06b6d4'
    ];

    return Array.from(
      { length: count },
      (_, i) => palette[i % palette.length]
    );
  }

  getChartLabel(): string {

    switch (this.selectedDataset) {

      case 'status':
        return this.translate.instant(
          'admin_dashboard.chart.labels.status'
        );

      case 'priority':
        return this.translate.instant(
          'admin_dashboard.chart.labels.priority'
        );

      case 'month':
        return this.translate.instant(
          'admin_dashboard.chart.labels.month'
        );

      case 'categorie':
        return this.translate.instant(
          'admin_dashboard.chart.labels.category'
        );

      default:
        return this.translate.instant(
          'admin_dashboard.chart.labels.default'
        );
    }
  }

  /* ================= REPORTING ENGINE ================= */

  toggleReportMenu(): void {
    this.reportMenuOpen = !this.reportMenuOpen;
  }

  selectReport(type: string): void {
    // Toggle visual highlight only, actual export is done via format buttons
  }

  private loadAllReclamations(): Promise<Reclamation[]> {
    return new Promise((resolve, reject) => {
      if (this.allReclamations.length > 0) {
        resolve(this.allReclamations);
        return;
      }
      this.reclamationService.getAllReclamations(0, 10000).subscribe({
        next: (response) => {
          this.allReclamations = response.content || [];
          resolve(this.allReclamations);
        },
        error: (err) => reject(err)
      });
    });
  }

  async exportSelectedReport(reportType: string, format: string): Promise<void> {
    this.reportMenuOpen = false;
    const allRecs = await this.loadAllReclamations();
    const dateStr = new Date().toLocaleDateString();
    const nowMs = Date.now();

    let title = '';
    let headers: string[] = [];
    let rows: string[][] = [];

    switch (reportType) {
      case 'hors_sla': {
        title = 'Réclamations Hors SLA';
        headers = ['Référence', 'Sujet', 'Priorité', 'Statut', 'Équipe', 'Date Limite SLA'];
        const horsSla = allRecs.filter(r =>
          r.slaStatus === 'DEPASSE' ||
          (r.slaDeadline && new Date(r.slaDeadline).getTime() < nowMs && r.statut !== 'TRAITEE')
        );
        rows = horsSla.map(r => [
          r.numeroReclamation, r.titre, r.priorite || 'MOYENNE', r.statut,
          r.equipeAssignee || 'Non assignée',
          r.slaDeadline ? new Date(r.slaDeadline).toLocaleDateString() : 'N/A'
        ]);
        break;
      }
      case 'par_projet': {
        title = 'Nombre de Réclamations par Projet';
        headers = ['Référence', 'Sujet', 'Priorité', 'Statut', 'Équipe', 'Date Création'];
        const projets = allRecs.filter(r => r.categorie === 'PROJET');
        rows = projets.map(r => [
          r.numeroReclamation, r.titre, r.priorite || 'MOYENNE', r.statut,
          r.equipeAssignee || 'Non assignée', new Date(r.dateCreation).toLocaleDateString()
        ]);
        break;
      }
      case 'maintenance': {
        title = 'Réclamations Projet Maintenance';
        headers = ['Référence', 'Sujet', 'Priorité', 'Statut', 'Type Maintenance', 'Équipe', 'Date Création'];
        const maint = allRecs.filter(r => r.categorie === 'MAINTENANCE');
        rows = maint.map(r => [
          r.numeroReclamation, r.titre, r.priorite || 'MOYENNE', r.statut,
          r.typeMaintenance || 'N/A', r.equipeAssignee || 'Non assignée',
          new Date(r.dateCreation).toLocaleDateString()
        ]);
        break;
      }
      case 'extraction': {
        title = 'Extraction Complète des Réclamations';
        headers = ['Référence', 'Sujet', 'Catégorie', 'Statut', 'Priorité', 'Équipe', 'Client', 'Date Création'];
        rows = allRecs.map(r => [
          r.numeroReclamation, r.titre, r.categorie, r.statut,
          r.priorite || 'MOYENNE', r.equipeAssignee || 'Non assignée',
          r.clientNom || 'N/A', new Date(r.dateCreation).toLocaleDateString()
        ]);
        break;
      }
      case 'par_statut': {
        title = 'Réclamations par Statut';
        headers = ['Statut', 'Nombre de Réclamations'];
        const statusMap: { [key: string]: number } = {};
        allRecs.forEach(r => { statusMap[r.statut] = (statusMap[r.statut] || 0) + 1; });
        rows = Object.keys(statusMap).map(s => [s, statusMap[s].toString()]);
        break;
      }
      case 'par_equipe': {
        title = 'Réclamations par Équipe';
        headers = ['Équipe Assignée', 'Nombre de Réclamations'];
        const eqMap: { [key: string]: number } = {};
        allRecs.forEach(r => {
          const eq = r.equipeAssignee || 'Non assignée';
          eqMap[eq] = (eqMap[eq] || 0) + 1;
        });
        rows = Object.keys(eqMap).map(eq => [eq, eqMap[eq].toString()]);
        break;
      }
      case 'reouvertes': {
        title = 'Réclamations Réouvertes';
        headers = ['Référence', 'Sujet', 'Priorité', 'Motif Réouverture', 'Équipe', 'Date Mise à jour'];
        const reouvertes = allRecs.filter(r => r.statut === 'REOUVERTE' || r.motifReouverture);
        rows = reouvertes.map(r => [
          r.numeroReclamation, r.titre, r.priorite || 'MOYENNE',
          r.motifReouverture || 'N/A', r.equipeAssignee || 'Non assignée',
          new Date(r.dateMiseAJour).toLocaleDateString()
        ]);
        break;
      }
      case 'depassement_sla': {
        title = 'Dépassement SLA - Détails';
        headers = ['Référence', 'Sujet', 'Priorité', 'Statut', 'Équipe', 'Date Limite SLA', 'Retard Estimé'];
        const depassees = allRecs.filter(r =>
          r.slaStatus === 'DEPASSE' ||
          (r.slaDeadline && new Date(r.slaDeadline).getTime() < nowMs && r.statut !== 'TRAITEE')
        );
        rows = depassees.map(r => {
          let retard = 'N/A';
          if (r.slaDeadline) {
            const diffMs = nowMs - new Date(r.slaDeadline).getTime();
            if (diffMs > 0) {
              const diffH = Math.floor(diffMs / 3600000);
              const diffM = Math.floor((diffMs % 3600000) / 60000);
              retard = `+${diffH}h ${diffM}min`;
            }
          }
          return [
            r.numeroReclamation, r.titre, r.priorite || 'MOYENNE', r.statut,
            r.equipeAssignee || 'Non assignée',
            r.slaDeadline ? new Date(r.slaDeadline).toLocaleDateString() : 'N/A',
            retard
          ];
        });
        break;
      }
    }

    this.exportData(title, headers, rows, format, dateStr);
  }

  async exportFullReport(format: string): Promise<void> {
    this.reportMenuOpen = false;
    const allRecs = await this.loadAllReclamations();
    const dateStr = new Date().toLocaleDateString();
    const nowMs = Date.now();

    if (format === 'pdf') {
      this.exportFullReportAsPdf(allRecs, dateStr, nowMs);
      return;
    }

    // For Excel/CSV full report, create multiple sheets or a combined table
    const headers = ['Référence', 'Sujet', 'Catégorie', 'Statut', 'Priorité', 'Équipe', 'Client', 'SLA Deadline', 'SLA Status', 'Motif Réouverture', 'Date Création'];
    const rows = allRecs.map(r => [
      r.numeroReclamation, r.titre, r.categorie, r.statut,
      r.priorite || 'MOYENNE', r.equipeAssignee || 'Non assignée',
      r.clientNom || 'N/A',
      r.slaDeadline ? new Date(r.slaDeadline).toLocaleDateString() : 'N/A',
      r.slaStatus || 'N/A', r.motifReouverture || '',
      new Date(r.dateCreation).toLocaleDateString()
    ]);

    this.exportData('Rapport_Complet_Admin', headers, rows, format, dateStr);
  }

  private exportData(title: string, headers: string[], rows: string[][], format: string, dateStr: string): void {
    const fileName = `${title.replace(/\s+/g, '_')}_${dateStr.replace(/\//g, '-')}`;

    if (format === 'pdf') {
      this.exportAsPdf(title, headers, rows, fileName, dateStr);
    } else if (format === 'excel') {
      this.exportAsExcel(title, headers, rows, fileName);
    } else if (format === 'csv') {
      this.exportAsCsv(headers, rows, fileName);
    }
  }

  private exportAsPdf(title: string, headers: string[], rows: string[][], fileName: string, dateStr: string): void {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235);
    doc.text(title, 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Généré le : ${dateStr} | Administrateur GDR DXC`, 14, 28);

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Total : ${rows.length} enregistrement(s)`, 14, 38);

    autoTable(doc, {
      startY: 44,
      head: [headers],
      body: rows,
      headStyles: { fillColor: [37, 99, 235] },
      theme: 'striped',
      styles: { fontSize: 7.5 }
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${i} sur ${pageCount} | GDR System DXC`, 105, 285, { align: 'center' });
    }

    doc.save(`${fileName}.pdf`);
  }

  private exportAsExcel(title: string, headers: string[], rows: string[][], fileName: string): void {
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Style column widths
    ws['!cols'] = headers.map(() => ({ wch: 22 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31));
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  }

  private exportAsCsv(headers: string[], rows: string[][], fileName: string): void {
    const BOM = '\uFEFF';
    const csvRows = [headers.join(';'), ...rows.map(r => r.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(';'))];
    const csvContent = BOM + csvRows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  private exportFullReportAsPdf(allRecs: Reclamation[], dateStr: string, nowMs: number): void {
    const doc = new jsPDF();

    // Title page
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235);
    doc.text('Rapport de Supervision Général (GDR)', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Généré le : ${dateStr} | Rôle : Administrateur`, 14, 28);

    const total = allRecs.length;
    const projetCount = allRecs.filter(r => r.categorie === 'PROJET').length;
    const maintenanceCount = allRecs.filter(r => r.categorie === 'MAINTENANCE').length;
    const horsSlaRecs = allRecs.filter(r =>
      r.slaStatus === 'DEPASSE' ||
      (r.slaDeadline && new Date(r.slaDeadline).getTime() < nowMs && r.statut !== 'TRAITEE')
    );
    const reouvertes = allRecs.filter(r => r.statut === 'REOUVERTE' || r.motifReouverture);

    // 1. KPI
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('1. Indicateurs Globaux', 14, 40);
    autoTable(doc, {
      startY: 45,
      head: [['Indicateur', 'Valeur']],
      body: [
        ['Total Réclamations', total.toString()],
        ['Catégorie PROJET', projetCount.toString()],
        ['Catégorie MAINTENANCE', maintenanceCount.toString()],
        ['Hors SLA', horsSlaRecs.length.toString()],
        ['Réclamations Réouvertes', reouvertes.length.toString()],
        ['Taux SLA Respecté', `${total > 0 ? Math.round(((total - horsSlaRecs.length) / total) * 100) : 100}%`]
      ],
      headStyles: { fillColor: [37, 99, 235] },
      theme: 'striped'
    });

    // 2. Par Statut
    doc.setFontSize(14);
    doc.text('2. Répartition par Statut', 14, (doc as any).lastAutoTable.finalY + 15);
    const statusMap: { [key: string]: number } = {};
    allRecs.forEach(r => { statusMap[r.statut] = (statusMap[r.statut] || 0) + 1; });
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Statut', 'Nombre']],
      body: Object.keys(statusMap).map(s => [s, statusMap[s].toString()]),
      headStyles: { fillColor: [37, 99, 235] },
      theme: 'striped'
    });

    // 3. Par Équipe
    doc.addPage();
    doc.setFontSize(14);
    doc.text('3. Répartition par Équipe', 14, 20);
    const eqMap: { [key: string]: number } = {};
    allRecs.forEach(r => { const eq = r.equipeAssignee || 'Non assignée'; eqMap[eq] = (eqMap[eq] || 0) + 1; });
    autoTable(doc, {
      startY: 25,
      head: [['Équipe', 'Nombre']],
      body: Object.keys(eqMap).map(eq => [eq, eqMap[eq].toString()]),
      headStyles: { fillColor: [124, 58, 237] },
      theme: 'striped'
    });

    // 4. Hors SLA
    doc.setFontSize(14);
    doc.text('4. Réclamations Hors SLA', 14, (doc as any).lastAutoTable.finalY + 15);
    if (horsSlaRecs.length > 0) {
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Référence', 'Sujet', 'Priorité', 'Équipe', 'Date Limite SLA']],
        body: horsSlaRecs.map(r => [
          r.numeroReclamation, r.titre, r.priorite || 'MOYENNE',
          r.equipeAssignee || 'Non assignée',
          r.slaDeadline ? new Date(r.slaDeadline).toLocaleDateString() : 'N/A'
        ]),
        headStyles: { fillColor: [220, 38, 38] },
        theme: 'striped',
        styles: { fontSize: 8 }
      });
    } else {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text('Aucun dépassement de SLA.', 14, (doc as any).lastAutoTable.finalY + 22);
    }

    // 5. Réouvertes
    doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('5. Réclamations Réouvertes', 14, 20);
    if (reouvertes.length > 0) {
      autoTable(doc, {
        startY: 25,
        head: [['Référence', 'Sujet', 'Motif Réouverture', 'Équipe', 'Date MAJ']],
        body: reouvertes.map(r => [
          r.numeroReclamation, r.titre, r.motifReouverture || 'N/A',
          r.equipeAssignee || 'Non assignée',
          new Date(r.dateMiseAJour).toLocaleDateString()
        ]),
        headStyles: { fillColor: [245, 158, 11] },
        theme: 'striped',
        styles: { fontSize: 8 }
      });
    } else {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text('Aucune réclamation réouverte.', 14, 27);
    }

    // 6. Extraction Complète
    doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('6. Extraction Complète', 14, 20);
    autoTable(doc, {
      startY: 25,
      head: [['Référence', 'Sujet', 'Catégorie', 'Statut', 'Priorité', 'Équipe', 'Date']],
      body: allRecs.map(r => [
        r.numeroReclamation, r.titre, r.categorie, r.statut,
        r.priorite || 'MOYENNE', r.equipeAssignee || 'Non assignée',
        new Date(r.dateCreation).toLocaleDateString()
      ]),
      headStyles: { fillColor: [37, 99, 235] },
      theme: 'striped',
      styles: { fontSize: 7 }
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${i} sur ${pageCount} | GDR System DXC`, 105, 285, { align: 'center' });
    }

    doc.save(`Rapport_Complet_Admin_${dateStr.replace(/\//g, '-')}.pdf`);
  }
}
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ReclamationService } from '../../../core/services/reclamation.service';
import { Reclamation } from '../../../core/models/reclamation.model';
import { Sidebar } from '../../../layout/sidebar/sidebar';
import { Navbar } from '../../../layout/navbar/navbar';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { forkJoin, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';

interface ReportType {
  value: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-reporting-center',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule, TranslateModule, Sidebar, Navbar],
  templateUrl: './reporting-center.html',
  styleUrls: ['./reporting-center.css']
})
export class ReportingCenterComponent implements OnInit {

  reportTypes: ReportType[] = [
    { value: 'extraction',      label: 'Extraction Complète',      icon: '📦' },
    { value: 'synthese',        label: 'Synthèse & KPIs',           icon: '📊' },
    { value: 'par_categorie',   label: 'Répartition par Catégorie', icon: '🏷️' },
    { value: 'par_statut',      label: 'Répartition par Statut',    icon: '🔵' },
    { value: 'par_equipe',      label: 'Répartition par Équipe',    icon: '👥' },
    { value: 'par_periode',     label: 'Évolution par Période',      icon: '📅' },
    { value: 'hors_sla',        label: 'Hors SLA',                  icon: '⚠️' },
    { value: 'depassement_sla', label: 'Dépassement SLA',           icon: '🔴' },
    { value: 'complet',         label: 'Rapport Complet (PDF)',      icon: '📑' },
  ];

  selectedReportType: string = 'extraction';
  selectedFormat: string = 'pdf';

  // ── Filters ──────────────────────────────────────────────
  selectedYear: string    = '';
  selectedMonth: string   = '';
  selectedCategorie: string = '';
  selectedStatut: string  = '';
  selectedEquipe: string  = '';

  availableYears: number[]   = [];
  availableEquipes: string[] = [];

  readonly months = [
    { value: '1',  label: 'Janvier' }, { value: '2',  label: 'Février' },
    { value: '3',  label: 'Mars' },    { value: '4',  label: 'Avril' },
    { value: '5',  label: 'Mai' },     { value: '6',  label: 'Juin' },
    { value: '7',  label: 'Juillet' }, { value: '8',  label: 'Août' },
    { value: '9',  label: 'Septembre'},{ value: '10', label: 'Octobre' },
    { value: '11', label: 'Novembre'},  { value: '12', label: 'Décembre' }
  ];

  readonly categories = ['PROJET', 'MAINTENANCE'];
  readonly statuts = ['EN_ATTENTE', 'EN_COURS', 'TRAITEE', 'REOUVERTE', 'REFUSEE'];
  // ─────────────────────────────────────────────────────────

  allReclamations: Reclamation[] = [];
  displayedData: any[] = [];
  tableHeaders: string[] = [];
  reportTitle: string = '';
  generatedAt: string = '';

  isLoading: boolean = false;
  hasError: boolean = false;
  errorMessage: string = '';

  constructor(private reclamationService: ReclamationService) {}

  ngOnInit(): void {
    this.loadFilterOptions();
  }

  /** Silently pre-loads all reclamations on init to populate Year & Team filter dropdowns */
  private loadFilterOptions(): void {
    this.reclamationService.getAllReclamations(0, 100)
      .pipe(
        switchMap((firstPage: any) => {
          const firstContent: Reclamation[] = firstPage?.content || firstPage?.reclamations || [];
          const totalPages: number = firstPage?.totalPages ?? 1;

          if (totalPages <= 1) return of(firstContent);

          const remaining = Array.from(
            { length: totalPages - 1 },
            (_, i) => this.reclamationService.getAllReclamations(i + 1, 100)
          );
          return forkJoin(remaining).pipe(
            switchMap((pages: any[]) => of([
              ...firstContent,
              ...pages.flatMap((p: any) => p?.content || p?.reclamations || [])
            ]))
          );
        }),
        catchError(() => of([]))
      )
      .subscribe((allRecs: Reclamation[]) => {
        this.allReclamations = allRecs;
        this.populateFilterOptions(allRecs);
      });
  }


  getSelectedReportLabel(): string {
    return this.reportTypes.find(r => r.value === this.selectedReportType)?.label ?? '';
  }

  resetPreview(): void {
    this.displayedData = [];
    this.tableHeaders = [];
    this.reportTitle = '';
    this.hasError = false;
    this.errorMessage = '';
  }

  /** Called when any filter changes — clears preview but keeps raw cache */
  onFilterChange(): void {
    this.resetPreview();
  }

  /** Populate dynamic filter options from loaded data */
  private populateFilterOptions(recs: Reclamation[]): void {
    const years = new Set<number>();
    const equipes = new Set<string>();
    recs.forEach(r => {
      if (r.dateCreation) {
        const y = new Date(r.dateCreation).getFullYear();
        if (!isNaN(y)) years.add(y);
      }
      if (r.equipeAssignee) equipes.add(r.equipeAssignee);
    });
    this.availableYears  = Array.from(years).sort((a, b) => b - a);
    this.availableEquipes = Array.from(equipes).sort();
  }

  /** Apply active filters to raw data before building the report */
  private applyFilters(recs: Reclamation[]): Reclamation[] {
    return recs.filter(r => {
      if (this.selectedYear || this.selectedMonth) {
        if (!r.dateCreation) return false;
        const d = new Date(r.dateCreation);
        if (this.selectedYear  && d.getFullYear()  !== +this.selectedYear)  return false;
        if (this.selectedMonth && (d.getMonth() + 1) !== +this.selectedMonth) return false;
      }
      if (this.selectedCategorie && r.categorie !== this.selectedCategorie) return false;
      if (this.selectedStatut    && r.statut    !== this.selectedStatut)    return false;
      if (this.selectedEquipe    && r.equipeAssignee !== this.selectedEquipe) return false;
      return true;
    });
  }

  /** Fetches ALL pages via RxJS (no async/await to avoid zone issues) */
  generatePreview(): void {
    this.displayedData = [];
    this.tableHeaders = [];
    this.hasError = false;
    this.errorMessage = '';

    // Use cache if data already loaded
    if (this.allReclamations.length > 0) {
      this.buildReport(this.applyFilters(this.allReclamations));
      return;
    }

    this.isLoading = true;

    // First request: get first page and discover total pages
    this.reclamationService.getAllReclamations(0, 100)
      .pipe(
        switchMap((firstPage: any) => {
          const firstContent: Reclamation[] = firstPage?.content || firstPage?.reclamations || [];
          const totalPages: number = firstPage?.totalPages ?? 1;

          if (totalPages <= 1) {
            return of(firstContent);
          }

          // Build observables for remaining pages
          const remainingRequests = Array.from(
            { length: totalPages - 1 },
            (_, i) => this.reclamationService.getAllReclamations(i + 1, 100)
          );

          return forkJoin(remainingRequests).pipe(
            switchMap((pages: any[]) => {
              const allContent = [
                ...firstContent,
                ...pages.flatMap((p: any) => p?.content || p?.reclamations || [])
              ];
              return of(allContent);
            })
          );
        }),
        catchError((err: any) => {
          this.isLoading = false;
          this.hasError = true;
          this.errorMessage = err?.error?.message
            || err?.message
            || 'Erreur serveur. Vérifiez que le backend est démarré et que vous êtes connecté(e).';
          return of([]);
        })
      )
      .subscribe((allRecs: Reclamation[]) => {
        this.isLoading = false;
        if (this.hasError) return;
        this.allReclamations = allRecs;
        this.populateFilterOptions(allRecs);
        this.buildReport(this.applyFilters(allRecs));
      });
  }

  /** Build report table from loaded data */
  private buildReport(allRecs: Reclamation[]): void {
    this.generatedAt = new Date().toLocaleString('fr-FR');
    const nowMs = Date.now();

    const safeDate = (d?: string): string => {
      if (!d) return 'N/A';
      try { return new Date(d).toLocaleDateString('fr-FR'); } catch { return 'N/A'; }
    };

    // Build a context suffix from active filters for report titles
    const ctxParts: string[] = [];
    if (this.selectedYear)      ctxParts.push(this.selectedYear);
    if (this.selectedMonth) {
      const m = this.months.find(x => x.value === this.selectedMonth);
      if (m) ctxParts.push(m.label);
    }
    if (this.selectedCategorie) ctxParts.push(this.selectedCategorie);
    if (this.selectedStatut)    ctxParts.push(this.selectedStatut);
    if (this.selectedEquipe)    ctxParts.push(this.selectedEquipe);
    const ctx = ctxParts.length ? ` — ${ctxParts.join(' | ')}` : '';

    switch (this.selectedReportType) {

      /* ---- Extraction complète ---------------------------------------- */
      case 'extraction': {
        this.reportTitle = `Extraction Complète${ctx}`;
        this.tableHeaders = ['Référence', 'Sujet', 'Catégorie', 'Statut', 'Priorité', 'Équipe', 'Client', 'Date Création'];
        this.displayedData = allRecs.map(r => [
          r.numeroReclamation, r.titre, r.categorie, r.statut,
          r.priorite || 'MOYENNE', r.equipeAssignee || 'Non assignée',
          r.clientNom || 'N/A', safeDate(r.dateCreation)
        ]);
        break;
      }

      /* ---- Synthèse & KPIs -------------------------------------------- */
      case 'synthese': {
        this.reportTitle = `Synthèse & KPIs${ctx}`;
        this.tableHeaders = ['Indicateur', 'Valeur', 'Détail'];
        const total   = allRecs.length;
        const traitee = allRecs.filter(r => r.statut === 'TRAITEE').length;
        const enCours = allRecs.filter(r => r.statut === 'EN_COURS').length;
        const attente = allRecs.filter(r => r.statut === 'EN_ATTENTE').length;
        const reouverte = allRecs.filter(r => r.statut === 'REOUVERTE').length;
        const horsSla = allRecs.filter(r =>
          r.slaStatus === 'DEPASSE' ||
          (r.slaDeadline && new Date(r.slaDeadline).getTime() < nowMs && r.statut !== 'TRAITEE')
        ).length;
        const projet  = allRecs.filter(r => r.categorie === 'PROJET').length;
        const maint   = allRecs.filter(r => r.categorie === 'MAINTENANCE').length;
        const tauxRes = total > 0 ? Math.round((traitee / total) * 100) : 0;
        const tauxSla = total > 0 ? Math.round(((total - horsSla) / total) * 100) : 100;
        this.displayedData = [
          ['Total réclamations',     total.toString(),         ''],
          ['Traitées',              traitee.toString(),        `${tauxRes}% taux résolution`],
          ['En cours',              enCours.toString(),        ''],
          ['En attente',            attente.toString(),        ''],
          ['Réouvertes',            reouverte.toString(),      ''],
          ['Catégorie PROJET',      projet.toString(),         `${total > 0 ? Math.round(projet/total*100) : 0}%`],
          ['Catégorie MAINTENANCE', maint.toString(),          `${total > 0 ? Math.round(maint/total*100) : 0}%`],
          ['Hors SLA',              horsSla.toString(),        `${tauxSla}% SLA respecté`],
        ];
        break;
      }

      /* ---- Répartition par Catégorie ------------------------------------ */
      case 'par_categorie': {
        this.reportTitle = `Répartition par Catégorie${ctx}`;
        this.tableHeaders = ['Catégorie', 'Nombre', '%', 'Traitées', 'En cours', 'Hors SLA'];
        const map: Record<string, { total: number; traitee: number; enCours: number; horsSla: number }> = {};
        allRecs.forEach(r => {
          const cat = r.categorie || 'N/A';
          if (!map[cat]) map[cat] = { total: 0, traitee: 0, enCours: 0, horsSla: 0 };
          map[cat].total++;
          if (r.statut === 'TRAITEE') map[cat].traitee++;
          if (r.statut === 'EN_COURS') map[cat].enCours++;
          if (r.slaStatus === 'DEPASSE' || (r.slaDeadline && new Date(r.slaDeadline).getTime() < nowMs && r.statut !== 'TRAITEE'))
            map[cat].horsSla++;
        });
        const total = allRecs.length;
        this.displayedData = Object.entries(map).map(([cat, v]) => [
          cat, v.total, `${total > 0 ? Math.round(v.total/total*100) : 0}%`,
          v.traitee, v.enCours, v.horsSla
        ]);
        break;
      }

      /* ---- Répartition par Statut -------------------------------------- */
      case 'par_statut': {
        this.reportTitle = `Répartition par Statut${ctx}`;
        this.tableHeaders = ['Statut', 'Nombre', 'Pourcentage'];
        const map: Record<string, number> = {};
        allRecs.forEach(r => { map[r.statut] = (map[r.statut] || 0) + 1; });
        const total = allRecs.length;
        this.displayedData = Object.entries(map).map(([s, n]) => [s, n, `${Math.round((n / total) * 100)}%`]);
        break;
      }

      /* ---- Répartition par Équipe -------------------------------------- */
      case 'par_equipe': {
        this.reportTitle = `Répartition par Équipe${ctx}`;
        this.tableHeaders = ['Équipe Assignée', 'Nombre', '%', 'Traitées', 'Hors SLA'];
        const map: Record<string, { total: number; traitee: number; horsSla: number }> = {};
        allRecs.forEach(r => {
          const eq = r.equipeAssignee || 'Non assignée';
          if (!map[eq]) map[eq] = { total: 0, traitee: 0, horsSla: 0 };
          map[eq].total++;
          if (r.statut === 'TRAITEE') map[eq].traitee++;
          if (r.slaStatus === 'DEPASSE' || (r.slaDeadline && new Date(r.slaDeadline).getTime() < nowMs && r.statut !== 'TRAITEE'))
            map[eq].horsSla++;
        });
        const total = allRecs.length;
        this.displayedData = Object.entries(map)
          .sort((a, b) => b[1].total - a[1].total)
          .map(([eq, v]) => [eq, v.total, `${total > 0 ? Math.round(v.total/total*100) : 0}%`, v.traitee, v.horsSla]);
        break;
      }

      /* ---- Évolution par Période (mensuelle) -------------------------- */
      case 'par_periode': {
        this.reportTitle = `Évolution par Période${ctx}`;
        this.tableHeaders = ['Année', 'Mois', 'Total', 'Traitées', 'En cours', 'Hors SLA'];
        const map: Record<string, { total: number; traitee: number; enCours: number; horsSla: number }> = {};
        allRecs.forEach(r => {
          if (!r.dateCreation) return;
          const d = new Date(r.dateCreation);
          const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
          if (!map[key]) map[key] = { total: 0, traitee: 0, enCours: 0, horsSla: 0 };
          map[key].total++;
          if (r.statut === 'TRAITEE') map[key].traitee++;
          if (r.statut === 'EN_COURS') map[key].enCours++;
          if (r.slaStatus === 'DEPASSE' || (r.slaDeadline && new Date(r.slaDeadline).getTime() < nowMs && r.statut !== 'TRAITEE'))
            map[key].horsSla++;
        });
        this.displayedData = Object.entries(map)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([key, v]) => {
            const [yr, mo] = key.split('-');
            const monthLabel = this.months.find(m => m.value === String(+mo))?.label || mo;
            return [yr, monthLabel, v.total, v.traitee, v.enCours, v.horsSla];
          });
        break;
      }

      /* ---- Hors SLA ---------------------------------------------------- */
      case 'hors_sla': {
        this.reportTitle = `Réclamations Hors SLA${ctx}`;
        this.tableHeaders = ['Référence', 'Sujet', 'Priorité', 'Statut', 'Équipe', 'Catégorie', 'Date Limite SLA'];
        const filtered = allRecs.filter(r =>
          r.slaStatus === 'DEPASSE' ||
          (r.slaDeadline && new Date(r.slaDeadline).getTime() < nowMs && r.statut !== 'TRAITEE')
        );
        this.displayedData = filtered.map(r => [
          r.numeroReclamation, r.titre, r.priorite || 'MOYENNE', r.statut,
          r.equipeAssignee || 'Non assignée', r.categorie, safeDate(r.slaDeadline)
        ]);
        break;
      }

      /* ---- Dépassement SLA détaillé ------------------------------------ */
      case 'depassement_sla': {
        this.reportTitle = `Dépassement SLA — Détails${ctx}`;
        this.tableHeaders = ['Référence', 'Sujet', 'Priorité', 'Statut', 'Équipe', 'Date Limite SLA', 'Retard'];
        const filtered = allRecs.filter(r =>
          r.slaStatus === 'DEPASSE' ||
          (r.slaDeadline && new Date(r.slaDeadline).getTime() < nowMs && r.statut !== 'TRAITEE')
        );
        this.displayedData = filtered.map(r => {
          let retard = 'N/A';
          if (r.slaDeadline) {
            const diff = nowMs - new Date(r.slaDeadline).getTime();
            if (diff > 0) retard = `+${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}min`;
          }
          return [r.numeroReclamation, r.titre, r.priorite || 'MOYENNE', r.statut,
                  r.equipeAssignee || 'Non assignée', safeDate(r.slaDeadline), retard];
        });
        break;
      }

      /* ---- Rapport complet multi-sections (PDF only) ------------------- */
      case 'complet': {
        this.reportTitle = `Rapport Complet${ctx}`;
        this.tableHeaders = ['Référence', 'Sujet', 'Catégorie', 'Statut', 'Priorité', 'Équipe', 'Date Limite SLA', 'Date Création'];
        this.displayedData = allRecs.map(r => [
          r.numeroReclamation, r.titre, r.categorie, r.statut,
          r.priorite || 'MOYENNE', r.equipeAssignee || 'Non assignée',
          safeDate(r.slaDeadline), safeDate(r.dateCreation)
        ]);
        break;
      }
    }
  }

  exportData(): void {
    if (this.displayedData.length === 0) return;

    if (this.selectedReportType === 'complet' && this.selectedFormat === 'pdf') {
      this.exportFullReportAsPdf();
      return;
    }

    const dateStr = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
    const fileName = `${this.reportTitle.replace(/\s+/g, '_')}_${dateStr}`;

    if (this.selectedFormat === 'pdf') {
      this.exportAsPdf(this.reportTitle, this.tableHeaders, this.displayedData, fileName, dateStr);
    } else if (this.selectedFormat === 'excel') {
      this.exportAsExcel(this.reportTitle, this.tableHeaders, this.displayedData, fileName);
    } else if (this.selectedFormat === 'csv') {
      this.exportAsCsv(this.tableHeaders, this.displayedData, fileName);
    }
  }

  private exportAsPdf(title: string, headers: string[], rows: any[][], fileName: string, dateStr: string): void {
    const doc = new jsPDF({ orientation: 'landscape' });
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
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 255] },
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 4 }
    });
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${i} sur ${pageCount} | GDR System — DXC Technology`, 148, 200, { align: 'center' });
    }
    doc.save(`${fileName}.pdf`);
  }

  private exportAsExcel(title: string, headers: string[], rows: any[][], fileName: string): void {
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = headers.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31));
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  }

  private exportAsCsv(headers: string[], rows: any[][], fileName: string): void {
    const BOM = '\uFEFF';
    const csvRows = [
      headers.join(';'),
      ...rows.map(r => r.map((cell: any) => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(';'))
    ];
    const blob = new Blob([BOM + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  private exportFullReportAsPdf(): void {
    const dateStr = new Date().toLocaleDateString('fr-FR');
    const nowMs = Date.now();
    const allRecs = this.allReclamations;
    const doc = new jsPDF();

    const safeDate = (d?: string): string => {
      if (!d) return 'N/A';
      try { return new Date(d).toLocaleDateString('fr-FR'); } catch { return 'N/A'; }
    };

    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235);
    doc.text('Rapport de Supervision Général — GDR', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Généré le : ${dateStr} | Rôle : Administrateur | DXC Technology`, 14, 28);

    const total = allRecs.length;
    const projetCount = allRecs.filter(r => r.categorie === 'PROJET').length;
    const maintenanceCount = allRecs.filter(r => r.categorie === 'MAINTENANCE').length;
    const horsSla = allRecs.filter(r =>
      r.slaStatus === 'DEPASSE' ||
      (r.slaDeadline && new Date(r.slaDeadline).getTime() < nowMs && r.statut !== 'TRAITEE')
    );
    const reouvertes = allRecs.filter(r => r.statut === 'REOUVERTE' || r.motifReouverture);

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
        ['Hors SLA', horsSla.length.toString()],
        ['Réclamations Réouvertes', reouvertes.length.toString()],
        ['Taux SLA Respecté', `${total > 0 ? Math.round(((total - horsSla.length) / total) * 100) : 100}%`]
      ],
      headStyles: { fillColor: [30, 58, 138] }, theme: 'striped'
    });

    doc.setFontSize(14);
    doc.text('2. Répartition par Statut', 14, (doc as any).lastAutoTable.finalY + 15);
    const statusMap: Record<string, number> = {};
    allRecs.forEach(r => { statusMap[r.statut] = (statusMap[r.statut] || 0) + 1; });
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Statut', 'Nombre']],
      body: Object.entries(statusMap).map(([s, n]) => [s, n.toString()]),
      headStyles: { fillColor: [30, 58, 138] }, theme: 'striped'
    });

    doc.addPage();
    doc.setFontSize(14);
    doc.text('3. Répartition par Équipe', 14, 20);
    const eqMap: Record<string, number> = {};
    allRecs.forEach(r => { const eq = r.equipeAssignee || 'Non assignée'; eqMap[eq] = (eqMap[eq] || 0) + 1; });
    autoTable(doc, {
      startY: 25,
      head: [['Équipe', 'Nombre']],
      body: Object.entries(eqMap).map(([eq, n]) => [eq, n.toString()]),
      headStyles: { fillColor: [124, 58, 237] }, theme: 'striped'
    });

    doc.setFontSize(14);
    doc.text('4. Réclamations Hors SLA', 14, (doc as any).lastAutoTable.finalY + 15);
    if (horsSla.length > 0) {
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Référence', 'Sujet', 'Priorité', 'Équipe', 'Date Limite SLA']],
        body: horsSla.map(r => [r.numeroReclamation, r.titre, r.priorite || 'MOYENNE',
          r.equipeAssignee || 'Non assignée', safeDate(r.slaDeadline)]),
        headStyles: { fillColor: [220, 38, 38] }, theme: 'striped', styles: { fontSize: 8 }
      });
    } else {
      doc.setFontSize(10); doc.setTextColor(100);
      doc.text('Aucun dépassement de SLA.', 14, (doc as any).lastAutoTable.finalY + 22);
    }

    doc.addPage();
    doc.setFontSize(14); doc.setTextColor(0);
    doc.text('5. Réclamations Réouvertes', 14, 20);
    if (reouvertes.length > 0) {
      autoTable(doc, {
        startY: 25,
        head: [['Référence', 'Sujet', 'Motif', 'Équipe', 'Date MAJ']],
        body: reouvertes.map(r => [r.numeroReclamation, r.titre, r.motifReouverture || 'N/A',
          r.equipeAssignee || 'Non assignée', safeDate(r.dateMiseAJour)]),
        headStyles: { fillColor: [245, 158, 11] }, theme: 'striped', styles: { fontSize: 8 }
      });
    } else {
      doc.setFontSize(10); doc.setTextColor(100);
      doc.text('Aucune réclamation réouverte.', 14, 27);
    }

    doc.addPage();
    doc.setFontSize(14); doc.setTextColor(0);
    doc.text('6. Extraction Complète', 14, 20);
    autoTable(doc, {
      startY: 25,
      head: [['Référence', 'Sujet', 'Catégorie', 'Statut', 'Priorité', 'Équipe', 'Date']],
      body: allRecs.map(r => [r.numeroReclamation, r.titre, r.categorie, r.statut,
        r.priorite || 'MOYENNE', r.equipeAssignee || 'Non assignée', safeDate(r.dateCreation)]),
      headStyles: { fillColor: [30, 58, 138] }, theme: 'striped', styles: { fontSize: 7 }
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8); doc.setTextColor(150);
      doc.text(`Page ${i} sur ${pageCount} | GDR System — DXC Technology`, 105, 285, { align: 'center' });
    }
    doc.save(`Rapport_Complet_Admin_${dateStr.replace(/\//g, '-')}.pdf`);
  }
}

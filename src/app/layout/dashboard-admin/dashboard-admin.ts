import { Component, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Chart from 'chart.js/auto';
import { Navbar } from '../navbar/navbar';
import { Sidebar} from '../sidebar/sidebar';
import { UserService } from '../../core/services/user.service';
import { ReclamationService } from '../../core/services/reclamation.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DashboardService, ChartData } from '../../core/services/dashboard.service';

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Navbar,
    Sidebar,
    TranslateModule
  ],
  templateUrl: './dashboard-admin.html',
  styleUrls: ['./dashboard-admin.css']
})
export class DashboardAdminComponent implements OnInit, AfterViewInit {

  usersCount: number = 0;
  reclamationsCount: number = 0;

  enCoursCount: number = 21;
  slaRespecte: number = 92;

  chart: Chart | null = null;

  chartType: 'bar' | 'line' | 'pie' | 'doughnut' = 'bar';
  chartTypes: ('bar' | 'line' | 'pie' | 'doughnut')[] = ['bar', 'line', 'pie', 'doughnut'];

  selectedDataset: 'status' | 'priority'|'month'| 'categorie' = 'status';
  selectedColor: string = '#3b82f6';

  chartData: ChartData[] = [];

  constructor(
    private userService: UserService,
    private reclamationService: ReclamationService,
    private dashboardService: DashboardService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadUsersCount();
    this.loadReclamationsCount();
    this.loadSelectedChartData();

    this.translate.onLangChange.subscribe(() => {
      this.renderChart();
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.renderChart();
    }, 0);
  }

  loadUsersCount(): void {
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.usersCount = users.length;
      },
      error: (err) => {
        console.error('Erreur chargement utilisateurs:', err);
      }
    });
  }

  loadReclamationsCount(): void {
    this.reclamationService.getReclamationsCount().subscribe({
      next: (count) => {
        this.reclamationsCount = count;
      },
      error: (err) => {
        console.error('Erreur chargement réclamations:', err);
      }
    });
  }

  loadSelectedChartData(): void {
    if (this.selectedDataset === 'status') {
      this.dashboardService.getStatusChart().subscribe({
        next: (data) => {
          this.chartData = data;
          this.renderChart();
        },
        error: (err) => {
          console.error('Erreur chargement statistiques statut:', err);
        }
      });
    }else if (this.selectedDataset === 'priority') {
    this.dashboardService.getPrioriteChart().subscribe({
      next: (data) => {
        this.chartData = data;
        this.renderChart();
      },
      error: (err) => {
        console.error('Erreur chargement statistiques priorité:', err);
      }
    });
  } else if (this.selectedDataset === 'categorie') {
    this.dashboardService.getCategorieChart().subscribe({
      next: (data) => {
        this.chartData = data;
        this.renderChart();
      },
      error: (err) => {
        console.error('Erreur chargement statistiques catégorie:', err);
      }
    });
  }

  else if (this.selectedDataset === 'month') {
    this.dashboardService.getMonthChart().subscribe(data => {
      this.chartData = data;
      this.renderChart();
    });
    }
  }
  

  renderChart(): void {
    const canvas = document.getElementById('claimsChart') as HTMLCanvasElement;

    if (!canvas || this.chartData.length === 0) {
      return;
    }

    if (this.chart) {
      this.chart.destroy();
    }

    const labels = this.chartData.map(item => this.translateChartLabel(item.label));
    const values = this.chartData.map(item => item.value);

    const backgroundColors = this.generateChartColors(values.length);
    const borderColors = [...backgroundColors];

    this.chart = new Chart(canvas, {
      type: this.chartType,
      data: {
        labels,
        datasets: [
          {
            label: this.getChartTitle(),
            data: values,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 1,
            borderRadius: this.chartType === 'bar' ? 8 : 0,
            tension: this.chartType === 'line' ? 0.35 : 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: 10
        },
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: this.chartType === 'bar' || this.chartType === 'line'
          ? {
              y: {
                beginAtZero: true,
                ticks: {
                  precision: 0
                }
              }
            }
          : {}
      }
    });
  }

  onChartTypeChange(): void {
    this.renderChart();
  }

  onColorChange(): void {
    this.renderChart();
  }

  onDatasetChange(): void {
    this.loadSelectedChartData();
  }

  generateChartColors(count: number): string[] {
    if (this.chartType === 'bar' || this.chartType === 'line') {
      return Array(count).fill(this.selectedColor);
    }

    const palette = [
      this.selectedColor,
      '#22c55e',
      '#f59e0b',
      '#ef4444',
      '#8b5cf6',
      '#06b6d4',
      '#84cc16',
      '#f97316'
    ];

    const colors: string[] = [];
    for (let i = 0; i < count; i++) {
      colors.push(palette[i % palette.length]);
    }

    return colors;
  }

 getChartTitle(): string {
  if (this.selectedDataset === 'status') {
    return this.translate.instant('admin_dashboard.datasets.status');
  }

  if (this.selectedDataset === 'priority') {
    return this.translate.instant('admin_dashboard.datasets.priority');
  }
   if (this.selectedDataset === 'month') {
    return this.translate.instant('admin_dashboard.datasets.month');
  }

  if (this.selectedDataset === 'categorie') {
    return this.translate.instant('admin_dashboard.datasets.category');
  }
    return '';
  }

  translateChartLabel(label: string): string {
    if (this.selectedDataset === 'status') {
      switch (label) {
        case 'EN_ATTENTE':
          return this.translate.instant('admin_dashboard.chart.pending');
        case 'EN_COURS':
          return this.translate.instant('admin_dashboard.chart.in_progress');
        case 'RESOLUE':
          return this.translate.instant('admin_dashboard.chart.resolved');
        case 'FERMEE':
          return this.translate.instant('admin_dashboard.chart.closed');
        case 'OUVERTE':
          return this.translate.instant('admin_dashboard.chart.open');
        default:
          return label;
      }
    }

    if (this.selectedDataset === 'priority') {
      switch (label) {
        case 'HAUTE':
          return this.translate.instant('admin_dashboard.priorities.high');
        case 'MOYENNE':
          return this.translate.instant('admin_dashboard.priorities.medium');
        case 'BASSE':
          return this.translate.instant('admin_dashboard.priorities.low');
        case 'URGENTE':
          return this.translate.instant('admin_dashboard.priorities.urgent');
        default:
          return label;
      }
    }
     if (this.selectedDataset === 'month') {
    switch (label) {
      case '1':
        return this.translate.instant('admin_dashboard.months.january');
      case '2':
        return this.translate.instant('admin_dashboard.months.february');
      case '3':
        return this.translate.instant('admin_dashboard.months.march');
      case '4':
        return this.translate.instant('admin_dashboard.months.april');
      case '5':
        return this.translate.instant('admin_dashboard.months.may');
      case '6':
        return this.translate.instant('admin_dashboard.months.june');
      case '7':
        return this.translate.instant('admin_dashboard.months.july');
      case '8':
        return this.translate.instant('admin_dashboard.months.august');
      case '9':
        return this.translate.instant('admin_dashboard.months.september');
      case '10':
        return this.translate.instant('admin_dashboard.months.october');
      case '11':
        return this.translate.instant('admin_dashboard.months.november');
      case '12':
        return this.translate.instant('admin_dashboard.months.december');
      default:
        return label;
    }
  }

if (this.selectedDataset === 'categorie') {
    switch (label) {
      case 'PROJET':
        return this.translate.instant('admin_dashboard.categories.project');
      case 'MAINTENANCE':
        return this.translate.instant('admin_dashboard.categories.maintenance');
      case 'TECHNIQUE':
        return this.translate.instant('admin_dashboard.categories.technical');
      case 'FACTURATION':
        return this.translate.instant('admin_dashboard.categories.billing');
      case 'SERVICE':
        return this.translate.instant('admin_dashboard.categories.service');
      case 'AUTRE':
        return this.translate.instant('admin_dashboard.categories.other');
      default:
        return label;
    }
  }
    return label;
  }
}
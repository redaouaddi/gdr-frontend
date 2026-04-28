import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

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

  chart: Chart | null = null;

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

  constructor(
    private dashboardService: DashboardService,
    private translate: TranslateService
  ) {}

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

    this.workflowStatus = this.translate.instant(
      'admin_dashboard.agents.workflow.no_blockage'
    );

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
        priorite: this.translate.instant(
          'admin_dashboard.priorities.high'
        ),
        priorityClass: 'danger',
        agent: 'agent1',
        deadline: '28/04/2026 10:30',
        delay: '+45 min',
        action: this.translate.instant(
          'admin_dashboard.sla_details.actions.remind_agent'
        )
      },

      {
        numero: 'REC-108',
        priorite: this.translate.instant(
          'admin_dashboard.priorities.medium'
        ),
        priorityClass: 'warning',
        agent: 'agent2',
        deadline: '28/04/2026 09:00',
        delay: '+2h',
        action: this.translate.instant(
          'admin_dashboard.sla_details.actions.reassign'
        )
      }
    ];
  }

  /* ================= AGENT CHARGE ================= */

  analyzeAgentWorkload(): void {

    this.agentWorkloads = this.agentWorkloads.map(agent => {

      if (agent.tickets >= 10) {
        return {
          ...agent,
          level: this.translate.instant(
            'admin_dashboard.workload.levels.overloaded'
          ),
          levelClass: 'danger',
          recommendation: this.translate.instant(
            'admin_dashboard.workload.recommendations.reassign'
          )
        };
      }

      if (agent.tickets >= 6) {
        return {
          ...agent,
          level: this.translate.instant(
            'admin_dashboard.workload.levels.busy'
          ),
          levelClass: 'warning',
          recommendation: this.translate.instant(
            'admin_dashboard.workload.recommendations.monitor'
          )
        };
      }

      return {
        ...agent,
        level: this.translate.instant(
          'admin_dashboard.workload.levels.normal'
        ),
        levelClass: 'success',
        recommendation: this.translate.instant(
          'admin_dashboard.workload.recommendations.available'
        )
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

    const labels = this.chartData.map(item => item.label);
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
}
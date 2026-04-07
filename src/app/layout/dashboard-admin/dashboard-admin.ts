import { Component, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import Chart from 'chart.js/auto';
import { NavbarComponent } from '../navbar/navbar';
import { SidebarComponent } from '../sidebar/sidebar';
import { UserService } from '../../core/services/user.service';
import { ReclamationService } from '../../core/services/reclamation.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [CommonModule, NavbarComponent, SidebarComponent, TranslateModule],
  templateUrl: './dashboard-admin.html',
  styleUrls: ['./dashboard-admin.css']
})
export class DashboardAdminComponent implements OnInit, AfterViewInit {

  usersCount: number = 0;
  reclamationsCount: number = 0;

  enCoursCount: number = 21;
  slaRespecte: number = 92;

  constructor(
    private userService: UserService,
    private reclamationService: ReclamationService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadUsersCount();
    this.loadReclamationsCount();
  }

  ngAfterViewInit(): void {
    const ctx: any = document.getElementById('claimsChart');

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [
          this.translate.instant('admin_dashboard.chart.open'),
          this.translate.instant('admin_dashboard.chart.in_progress'),
          this.translate.instant('admin_dashboard.chart.resolved'),
          this.translate.instant('admin_dashboard.chart.closed')
        ],
        datasets: [{
          label: this.translate.instant('admin_dashboard.cards.claims'),
          data: [12, 19, 8, 15],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
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
}
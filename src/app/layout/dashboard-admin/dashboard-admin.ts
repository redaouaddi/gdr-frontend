import { Component, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import Chart from 'chart.js/auto';
import { NavbarComponent } from '../navbar/navbar';
import { SidebarComponent } from '../sidebar/sidebar';
import { UserService } from '../../core/services/user.service';
import { ReclamationService } from '../../core/services/reclamation.service';

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [CommonModule, NavbarComponent, SidebarComponent],
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
    private reclamationService: ReclamationService
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
        labels: ['Open', 'In Progress', 'Resolved', 'Closed'],
        datasets: [{
          label: 'Réclamations',
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
        console.log('Users response:', users);
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
        console.log('Réclamations count:', count);
        this.reclamationsCount = count;
      },
      error: (err) => {
        console.error('Erreur chargement réclamations:', err);
      }
    });
  }
}
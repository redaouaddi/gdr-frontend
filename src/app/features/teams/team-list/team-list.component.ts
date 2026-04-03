import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EquipeService } from '../../../core/services/equipe.service';
import { Equipe } from '../../../core/models/equipe.model';
import { NavbarComponent } from '../../../layout/navbar/navbar';
import { SidebarComponent } from '../../../layout/sidebar/sidebar';
import { finalize, timeout } from 'rxjs/operators';

@Component({
  selector: 'app-team-list',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, SidebarComponent],
  templateUrl: './team-list.component.html'
})
export class TeamListComponent implements OnInit {
  equipes: Equipe[] = [];
  isLoading = true;
  errorMessage = '';

  constructor(private equipeService: EquipeService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadTeams();
  }

  loadTeams(): void {
    console.log('--- FETCHING TEAMS STARTED ---');
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.equipeService.getAllTeams()
    .pipe(
      timeout(15000),
      finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      })
    )
    .subscribe({
      next: (data) => {
        console.log('--- FETCHING TEAMS SUCCESS ---', data);
        this.equipes = data;
      },
      error: (err) => {
        console.error('--- FETCHING TEAMS ERROR ---', err);
        this.errorMessage = 'Impossible de charger la liste des équipes. Le serveur met trop de temps à répondre ou est inaccessible.';
      }
    });
  }
}

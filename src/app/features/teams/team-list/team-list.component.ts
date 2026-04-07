import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EquipeService } from '../../../core/services/equipe.service';
import { Equipe } from '../../../core/models/equipe.model';
import { NavbarComponent } from '../../../layout/navbar/navbar';
import { SidebarComponent } from '../../../layout/sidebar/sidebar';
import { finalize, timeout } from 'rxjs/operators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-team-list',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, SidebarComponent, TranslateModule],
  templateUrl: './team-list.component.html'
})
export class TeamListComponent implements OnInit {
  equipes: Equipe[] = [];
  isLoading = true;
  errorMessage = '';

  constructor(
    private equipeService: EquipeService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadTeams();
  }

  loadTeams(): void {
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
          this.equipes = data;
        },
        error: (err) => {
          console.error('--- FETCHING TEAMS ERROR ---', err);
          this.errorMessage = this.translate.instant('team_list.errors.load_failed');
        }
      });
  }

  getAgentsCountLabel(count: number): string {
    return this.translate.instant('team_list.agents_count', { count });
  }

  getTeamLeaderName(name?: string | null): string {
    return name || this.translate.instant('team_list.unassigned');
  }
}
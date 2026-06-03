import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EquipeService } from '../../../core/services/equipe.service';
import { Equipe } from '../../../core/models/equipe.model';
import { Navbar } from '../../../layout/navbar/navbar';
import { Sidebar } from '../../../layout/sidebar/sidebar';
import { finalize, timeout } from 'rxjs/operators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-team-list',
  standalone: true,
  imports: [CommonModule, RouterLink, Navbar, Sidebar, TranslateModule, FormsModule],
  templateUrl: './team-list.component.html'
})
export class TeamListComponent implements OnInit {
  equipes: Equipe[] = [];
  isLoading = true;
  errorMessage = '';

  // Pagination
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  allTeamsForReassignment: Equipe[] = [];
  selectedTeamToDelete: Equipe | null = null;
  targetTeamId: number | null = null;

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

    this.equipeService.getAllTeams(this.currentPage, this.pageSize)
      .pipe(
        timeout(15000),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.equipes = response.content;
          this.totalElements = response.totalElements;
          this.totalPages = response.totalPages;
        },
        error: (err) => {
          console.error('--- FETCHING TEAMS ERROR ---', err);
          this.errorMessage = this.translate.instant('team_list.errors.load_failed');
        }
      });
    
    // Fetch all teams for potential reassignment (without pagination limits)
    this.equipeService.getAllTeams(0, 1000).subscribe({
      next: (response) => {
        this.allTeamsForReassignment = response.content;
      }
    });
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadTeams();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadTeams();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadTeams();
    }
  }

  getAgentsCountLabel(count: number): string {
    return this.translate.instant('team_list.agents_count', { count });
  }

  getTeamLeaderName(name?: string | null): string {
    return name || this.translate.instant('team_list.unassigned');
  }

  deleteTeam(id: number): void {
    const team = this.equipes.find(e => e.id === id);
    if (!team) return;

    if (team.nombreReclamations && team.nombreReclamations > 0) {
      this.selectedTeamToDelete = team;
      this.targetTeamId = null;
      // Use the pre-fetched list of all teams
      this.allTeamsForReassignment = this.allTeamsForReassignment.filter(e => e.id !== id);
      
      this.cdr.detectChanges();
      const modalElement = document.getElementById('reassignmentModal');
      if (modalElement) {
        const modal = new (window as any).bootstrap.Modal(modalElement);
        modal.show();
      }
    } else {
      if (confirm(this.translate.instant('team_list.confirm_delete'))) {
        this.executeDelete(id);
      }
    }
  }

  confirmDeletionWithReassignment(): void {
    if (!this.selectedTeamToDelete || !this.targetTeamId || !this.selectedTeamToDelete.id) return;

    this.executeDelete(this.selectedTeamToDelete.id, this.targetTeamId);
    
    const modalElement = document.getElementById('reassignmentModal');
    if (modalElement) {
      const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
      if (modal) modal.hide();
    }
  }

  private executeDelete(id: number, targetTeamId?: number): void {
    this.equipeService.deleteTeam(id, targetTeamId).subscribe({
      next: () => {
        this.loadTeams();
        this.selectedTeamToDelete = null;
        this.targetTeamId = null;
      },
      error: (err) => {
        console.error('--- DELETE TEAM ERROR ---', err);
        if (err.error && err.error.message) {
          this.errorMessage = err.error.message;
        } else {
          this.errorMessage = this.translate.instant('team_list.errors.delete_failed');
        }
        this.cdr.detectChanges();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }
}
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EquipeService } from '../../../core/services/equipe.service';
import { Equipe } from '../../../core/models/equipe.model';
import { Navbar } from '../../../layout/navbar/navbar';
import { Sidebar } from '../../../layout/sidebar/sidebar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-my-team',
  standalone: true,
  imports: [CommonModule, Navbar, Sidebar, TranslateModule],
  templateUrl: './my-team.component.html'
})
export class MyTeamComponent implements OnInit {
  myTeam: Equipe | null = null;
  isLoading = true;
  errorMessage = '';

  constructor(
    private equipeService: EquipeService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.loadTeam();
  }

  loadTeam(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.equipeService.getMaGestion().subscribe({
      next: (team) => {
        this.isLoading = false;
        this.myTeam = team;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status !== 404) {
          this.errorMessage = this.translate.instant('my_team.errors.load_team');
        }
        this.cdr.detectChanges();
      }
    });
  }
}
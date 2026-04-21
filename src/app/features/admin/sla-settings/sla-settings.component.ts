import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { Navbar } from '../../../layout/navbar/navbar';
import { Sidebar } from '../../../layout/sidebar/sidebar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SlaConfiguration } from '../../../core/models/sla-configuration.model';
import { SlaConfigService } from '../../../core/services/sla-config.service';

@Component({
  selector: 'app-sla-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar, Sidebar, TranslateModule],
  templateUrl: './sla-settings.component.html',
  styleUrls: ['./sla-settings.component.css']
})
export class SlaSettingsComponent implements OnInit {

  slaConfigurations: SlaConfiguration[] = [];
  isLoading = false;
  isSaving = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private slaConfigService: SlaConfigService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadConfigurations();
  }

  loadConfigurations(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.slaConfigService.getAll()
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (data) => {
          this.slaConfigurations = [...data];

          if (this.slaConfigurations.length === 0) {
            this.slaConfigurations = [
              { priorite: 'FAIBLE', delaiHeures: 48 },
              { priorite: 'MOYENNE', delaiHeures: 24 },
              { priorite: 'ELEVEE', delaiHeures: 8 }
            ];
          }

          this.sortConfigurations();
        },
        error: (err) => {
          console.error(err);
          this.errorMessage = this.translate.instant('sla_settings.errors.load_failed');
        }
      });
  }

  saveAll(): void {
    this.errorMessage = '';
    this.successMessage = '';

    const invalid = this.slaConfigurations.some(cfg => !cfg.delaiHeures || cfg.delaiHeures <= 0);

    if (invalid) {
      this.errorMessage = this.translate.instant('sla_settings.errors.invalid_delay');
      return;
    }

    this.isSaving = true;

    let completed = 0;
    const total = this.slaConfigurations.length;

    this.slaConfigurations.forEach(cfg => {
      this.slaConfigService.save(cfg).subscribe({
        next: () => {
          completed++;

          if (completed === total) {
            this.isSaving = false;
            this.successMessage = this.translate.instant('sla_settings.success');
            this.loadConfigurations();
          }
        },
        error: (err) => {
          console.error(err);
          this.isSaving = false;
          this.errorMessage = this.translate.instant('sla_settings.errors.save_failed');
        }
      });
    });
  }

  translatePriority(priorite: string): string {
    return this.translate.instant('priority.' + priorite);
  }

  getPriorityBadgeClass(priorite: string): string {
    switch (priorite) {
      case 'ELEVEE':
        return 'bg-danger bg-opacity-10 text-danger border border-danger';
      case 'MOYENNE':
        return 'bg-warning bg-opacity-10 text-warning border border-warning';
      case 'FAIBLE':
        return 'bg-success bg-opacity-10 text-success border border-success';
      default:
        return 'bg-light text-dark';
    }
  }

  private sortConfigurations(): void {
    const order: Record<string, number> = {
      FAIBLE: 1,
      MOYENNE: 2,
      ELEVEE: 3
    };

    this.slaConfigurations.sort((a, b) => {
      return (order[a.priorite] || 999) - (order[b.priorite] || 999);
    });
  }
}
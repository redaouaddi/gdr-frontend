import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Page } from '../models/pagination.model';
import { AuditLog } from '../models/audit-log.model';

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private apiUrl = 'http://localhost:8080/api/admin/audit-logs';

  constructor(private http: HttpClient) {}

  getAuditLogs(
    page = 0,
    size = 20,
    role?: string,
    user?: string,
    action?: string,
    startDate?: string,
    endDate?: string,
    search?: string,
    excludeConsultations = false
  ): Observable<Page<AuditLog>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (role?.trim()) {
      params = params.set('role', role.trim());
    }
    if (user?.trim()) {
      params = params.set('user', user.trim());
    }
    if (action?.trim()) {
      params = params.set('action', action.trim());
    }
    if (startDate?.trim()) {
      params = params.set('startDate', startDate.trim());
    }
    if (endDate?.trim()) {
      params = params.set('endDate', endDate.trim());
    }
    if (search?.trim()) {
      params = params.set('search', search.trim());
    }
    if (excludeConsultations) {
      params = params.set('excludeConsultations', 'true');
    }

    return this.http.get<Page<unknown>>(this.apiUrl, { params }).pipe(
      map((response) => ({
        ...response,
        content: (response.content || []).map((item) => this.normalizeLog(item))
      }))
    );
  }

  exportExcel(
    role?: string,
    user?: string,
    action?: string,
    startDate?: string,
    endDate?: string,
    search?: string,
    excludeConsultations = false
  ): Observable<Blob> {
    let params = new HttpParams();
    if (role?.trim()) {
      params = params.set('role', role.trim());
    }
    if (user?.trim()) {
      params = params.set('user', user.trim());
    }
    if (action?.trim()) {
      params = params.set('action', action.trim());
    }
    if (startDate?.trim()) {
      params = params.set('startDate', startDate.trim());
    }
    if (endDate?.trim()) {
      params = params.set('endDate', endDate.trim());
    }
    if (search?.trim()) {
      params = params.set('search', search.trim());
    }
    if (excludeConsultations) {
      params = params.set('excludeConsultations', 'true');
    }

    return this.http.get(this.apiUrl + '/export/excel', {
      params,
      responseType: 'blob'
    });
  }

  exportPdf(
    role?: string,
    user?: string,
    action?: string,
    startDate?: string,
    endDate?: string,
    search?: string,
    excludeConsultations = false
  ): Observable<Blob> {
    let params = new HttpParams();
    if (role?.trim()) {
      params = params.set('role', role.trim());
    }
    if (user?.trim()) {
      params = params.set('user', user.trim());
    }
    if (action?.trim()) {
      params = params.set('action', action.trim());
    }
    if (startDate?.trim()) {
      params = params.set('startDate', startDate.trim());
    }
    if (endDate?.trim()) {
      params = params.set('endDate', endDate.trim());
    }
    if (search?.trim()) {
      params = params.set('search', search.trim());
    }
    if (excludeConsultations) {
      params = params.set('excludeConsultations', 'true');
    }

    return this.http.get(this.apiUrl + '/export/pdf', {
      params,
      responseType: 'blob'
    });
  }

  private normalizeLog(raw: unknown): AuditLog {
    const r = (raw || {}) as Record<string, unknown>;
    const actorEmail = String(
      r['actorEmail'] ?? r['userEmail'] ?? r['email'] ?? r['utilisateur'] ?? ''
    );
    const actorName = String(
      r['actorName'] ??
        r['userName'] ??
        r['nomUtilisateur'] ??
        ([r['firstName'], r['lastName']].filter(Boolean).join(' ') || actorEmail)
    );
    const timestamp = String(
      r['timestamp'] ?? r['dateAction'] ?? r['createdAt'] ?? r['date'] ?? ''
    );

    return {
      id: Number(r['id'] ?? 0),
      actorEmail,
      actorName,
      role: String(r['role'] ?? r['userRole'] ?? r['roles'] ?? '—'),
      action: String(r['action'] ?? r['actionType'] ?? r['type'] ?? '—'),
      entityType: r['entityType'] != null ? String(r['entityType']) : undefined,
      entityId: r['entityId'] != null ? String(r['entityId']) : undefined,
      details: r['details'] != null ? String(r['details']) : undefined,
      ipAddress: r['ipAddress'] != null ? String(r['ipAddress']) : undefined,
      timestamp
    };
  }
}

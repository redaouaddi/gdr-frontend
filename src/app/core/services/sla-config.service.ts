import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SlaConfiguration } from '../models/sla-configuration.model';
import { Page } from '../models/pagination.model';

@Injectable({
  providedIn: 'root'
})
export class SlaConfigService {

  private adminApiUrl = 'http://localhost:8080/api/admin/sla';
  private apiUrl = 'http://localhost:8080/api/sla';

  constructor(private http: HttpClient) {}

  getAll(page: number = 0, size: number = 10): Observable<Page<SlaConfiguration>> {
    return this.http.get<Page<SlaConfiguration>>(`${this.apiUrl}?page=${page}&size=${size}`);
  }

  save(config: SlaConfiguration): Observable<SlaConfiguration> {
    return this.http.post<SlaConfiguration>(this.adminApiUrl, config);
  }
}
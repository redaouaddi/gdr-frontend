import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SlaConfiguration } from '../models/sla-configuration.model';

@Injectable({
  providedIn: 'root'
})
export class SlaConfigService {

  private adminApiUrl = 'http://localhost:8080/api/admin/sla';
  private apiUrl = 'http://localhost:8080/api/sla';

  constructor(private http: HttpClient) {}

  getAll(): Observable<SlaConfiguration[]> {
    return this.http.get<SlaConfiguration[]>(this.apiUrl);
  }

  save(config: SlaConfiguration): Observable<SlaConfiguration> {
    return this.http.post<SlaConfiguration>(this.adminApiUrl, config);
  }
}
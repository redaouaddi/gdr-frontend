import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Reclamation, CreateReclamationRequest, ReclamationStatusResponse } from '../models/reclamation.model';

@Injectable({
  providedIn: 'root'
})
export class ReclamationService {
  private apiUrl = 'http://localhost:8080/api/reclamations';

  constructor(private http: HttpClient) { }

  createReclamation(request: CreateReclamationRequest): Observable<Reclamation> {
    return this.http.post<Reclamation>(this.apiUrl, request);
  }

  getMyReclamations(): Observable<Reclamation[]> {
    return this.http.get<Reclamation[]>(`${this.apiUrl}/mes-reclamations`);
  }

  getReclamationStatus(numeroReclamation: string): Observable<ReclamationStatusResponse> {
    return this.http.get<ReclamationStatusResponse>(`${this.apiUrl}/${numeroReclamation}/statut`);
  }
}

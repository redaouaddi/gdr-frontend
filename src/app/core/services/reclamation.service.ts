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

  createReclamation(request: CreateReclamationRequest, file?: File): Observable<Reclamation> {
    const formData = new FormData();
    formData.append('titre', request.titre);
    formData.append('description', request.description);
    formData.append('categorie', request.categorie);
    formData.append('priorite', request.priorite);

    if (request.typeMaintenance) {
      formData.append('typeMaintenance', request.typeMaintenance);
      if (request.typeMaintenance === 'INCIDENT') {
        if (request.sousCategorieIncident) {
          formData.append('sousCategorieIncident', request.sousCategorieIncident);
        }
        if (request.sousCategorieIncident === 'AUTRE' && request.detailsAutreIncident) {
          formData.append('detailsAutreIncident', request.detailsAutreIncident);
        }
      }
    }

    if (file) {
      formData.append('file', file);
    }

    return this.http.post<Reclamation>(this.apiUrl, formData);
  }

  getMyReclamations(): Observable<Reclamation[]> {
    return this.http.get<Reclamation[]>(`${this.apiUrl}/mes-reclamations`);
  }

  getReclamationStatus(numeroReclamation: string): Observable<ReclamationStatusResponse> {
    return this.http.get<ReclamationStatusResponse>(`${this.apiUrl}/${numeroReclamation}/statut`);
  }
  getReclamationsCount(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/count`);
  }

  assignerEquipe(numeroReclamation: string, equipeId: number): Observable<Reclamation> {
    return this.http.put<Reclamation>(`${this.apiUrl}/${numeroReclamation}/assigner-equipe?idEquipe=${equipeId}`, {});
  }

  rejeterReclamation(numeroReclamation: string, motif: string): Observable<Reclamation> {
    return this.http.put<Reclamation>(`${this.apiUrl}/${numeroReclamation}/rejeter?motif=${encodeURIComponent(motif)}`, {});
  }

  getReclamationsParEquipe(equipeId: number): Observable<Reclamation[]> {
    return this.http.get<Reclamation[]>(`${this.apiUrl}/equipe/${equipeId}`);
  }

  getAllReclamations(): Observable<Reclamation[]> {
    return this.http.get<Reclamation[]>(this.apiUrl);
  }

  getNouvellesReclamations(): Observable<Reclamation[]> {
    return this.http.get<Reclamation[]>(`${this.apiUrl}/nouvelles`);
  }

  accepterReclamation(numeroReclamation: string): Observable<Reclamation> {
    return this.http.put<Reclamation>(`${this.apiUrl}/${numeroReclamation}/accepter`, {});
  }

  marquerResolue(numeroReclamation: string): Observable<Reclamation> {
    return this.http.put<Reclamation>(`${this.apiUrl}/${numeroReclamation}/resoudre`, {});
  }

  getMesMissions(): Observable<Reclamation[]> {
    return this.http.get<Reclamation[]>(`${this.apiUrl}/mes-missions`);
  }
}

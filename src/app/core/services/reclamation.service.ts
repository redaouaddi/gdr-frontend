import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Reclamation, CreateReclamationRequest, ReclamationStatusResponse } from '../models/reclamation.model';
import { Page } from '../models/pagination.model';

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

  getMyReclamations(page: number = 0, size: number = 10): Observable<Page<Reclamation>> {
    return this.http.get<Page<Reclamation>>(`${this.apiUrl}/mes-reclamations?page=${page}&size=${size}`);
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

  getReclamationsParEquipe(equipeId: number, page: number = 0, size: number = 10): Observable<Page<Reclamation>> {
    return this.http.get<Page<Reclamation>>(`${this.apiUrl}/equipe/${equipeId}?page=${page}&size=${size}`);
  }

  getAllReclamations(page: number = 0, size: number = 10, status?: string): Observable<Page<Reclamation>> {
    let url = `${this.apiUrl}?page=${page}&size=${size}`;
    if (status) {
      url += `&statut=${status}`;
    }
    return this.http.get<Page<Reclamation>>(url);
  }

  getNouvellesReclamations(page: number = 0, size: number = 10): Observable<Page<Reclamation>> {
    return this.http.get<Page<Reclamation>>(`${this.apiUrl}/nouvelles?page=${page}&size=${size}`);
  }

  accepterReclamation(numeroReclamation: string): Observable<Reclamation> {
    return this.http.put<Reclamation>(`${this.apiUrl}/${numeroReclamation}/accepter`, {});
  }

  reouvrirReclamation(numeroReclamation: string, motif: string, file: File): Observable<Reclamation> {
    const formData = new FormData();
    formData.append('motif', motif);
    formData.append('file', file);
    return this.http.put<Reclamation>(`${this.apiUrl}/${numeroReclamation}/reouvrir`, formData);
  }

  marquerResolue(numeroReclamation: string, cause?: string, action?: string, solution?: string): Observable<Reclamation> {
    let params = new HttpParams();
    if (cause) params = params.set('cause', cause);
    if (action) params = params.set('action', action);
    if (solution) params = params.set('solution', solution);
    
    return this.http.put<Reclamation>(`${this.apiUrl}/${numeroReclamation}/resoudre`, {}, { params });
  }

  getMesMissions(page: number = 0, size: number = 10): Observable<Page<Reclamation>> {
    return this.http.get<Page<Reclamation>>(`${this.apiUrl}/mes-missions?page=${page}&size=${size}`);
  }

  downloadAttachment(numeroReclamation: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${numeroReclamation}/telecharger-piece-jointe`, {
      responseType: 'blob'
    });
  }

  downloadReouvertureAttachment(numeroReclamation: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${numeroReclamation}/telecharger-piece-jointe-reouverture`, {
      responseType: 'blob'
    });
  }
}


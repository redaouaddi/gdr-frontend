import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Equipe } from '../models/equipe.model';
import { UserResponse } from './user.service';
import { Page } from '../models/pagination.model';

@Injectable({
  providedIn: 'root'
})
export class EquipeService {
  private apiUrl = 'http://localhost:8080/api/equipes';

  constructor(private http: HttpClient) { }

  getAllTeams(page: number = 0, size: number = 10): Observable<Page<Equipe>> {
    return this.http.get<Page<Equipe>>(`${this.apiUrl}?page=${page}&size=${size}`);
  }

  createTeam(equipe: { nom: string, chefEmail: string }): Observable<Equipe> {
    return this.http.post<Equipe>(this.apiUrl, equipe);
  }

  getTeamById(id: number): Observable<Equipe> {
    return this.http.get<Equipe>(`${this.apiUrl}/${id}`);
  }

  updateTeam(id: number, equipe: { nom: string, chefEmail: string }): Observable<Equipe> {
    return this.http.put<Equipe>(`${this.apiUrl}/${id}`, equipe);
  }

  getMaGestion(): Observable<Equipe> {
    return this.http.get<Equipe>(`${this.apiUrl}/ma-gestion`);
  }

  getFreeAgents(page: number = 0, size: number = 10): Observable<Page<UserResponse>> {
    return this.http.get<Page<UserResponse>>(`${this.apiUrl}/agents-libres?page=${page}&size=${size}`);
  }

  // ADMIN seulement
  recruterAgent(equipeId: number, agentId: number): Observable<Equipe> {
    return this.http.post<Equipe>(`${this.apiUrl}/${equipeId}/agents/${agentId}`, {});
  }

  // ADMIN seulement
  retirerAgent(equipeId: number, agentId: number): Observable<Equipe> {
    return this.http.delete<Equipe>(`${this.apiUrl}/${equipeId}/agents/${agentId}`);
  }

  deleteTeam(id: number, targetTeamId?: number): Observable<void> {
    let params = new HttpParams();
    if (targetTeamId) {
      params = params.set('targetTeamId', targetTeamId.toString());
    }
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { params });
  }
}
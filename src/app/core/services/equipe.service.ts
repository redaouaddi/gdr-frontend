import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Equipe } from '../models/equipe.model';
import { UserResponse } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class EquipeService {
  private apiUrl = 'http://localhost:8080/api/equipes';

  constructor(private http: HttpClient) {}

  getAllTeams(): Observable<Equipe[]> {
    return this.http.get<Equipe[]>(this.apiUrl);
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

  getFreeAgents(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(`${this.apiUrl}/agents-libres`);
  }

  recruterAgent(agentId: number): Observable<Equipe> {
    return this.http.post<Equipe>(`${this.apiUrl}/ma-gestion/agents/${agentId}`, {});
  }

  retirerAgent(agentId: number): Observable<Equipe> {
    return this.http.delete<Equipe>(`${this.apiUrl}/ma-gestion/agents/${agentId}`);
  }
}

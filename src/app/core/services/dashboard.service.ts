import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChartData {
  label: string;
  value: number;
}

export interface DashboardStats {
  usersCount: number;
  reclamationsCount: number;
  enCoursCount: number;
  slaRespecte: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  private api = 'http://localhost:8080/api/dashboard';

  constructor(private http: HttpClient) {}

  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.api}/stats`);
  }

  getStatusChart(): Observable<ChartData[]> {
    return this.http.get<ChartData[]>(`${this.api}/reclamations-status`);
  }

  getPrioriteChart(): Observable<ChartData[]> {
    return this.http.get<ChartData[]>(`${this.api}/reclamations-priorite`);
  }

  getMonthChart(): Observable<ChartData[]> {
    return this.http.get<ChartData[]>(`${this.api}/reclamations-month`);
  }

  getCategorieChart(): Observable<ChartData[]> {
    return this.http.get<ChartData[]>(`${this.api}/reclamations-categorie`);
  }
}
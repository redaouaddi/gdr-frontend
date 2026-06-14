import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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

  private buildParams(year?: number, month?: number, priorite?: string, equipeId?: number): HttpParams {
    let params = new HttpParams();
    if (year) params = params.set('year', year.toString());
    if (month) params = params.set('month', month.toString());
    if (priorite) params = params.set('priorite', priorite);
    if (equipeId) params = params.set('equipeId', equipeId.toString());
    return params;
  }

  getDashboardStats(year?: number, month?: number, priorite?: string, equipeId?: number): Observable<DashboardStats> {
    const params = this.buildParams(year, month, priorite, equipeId);
    return this.http.get<DashboardStats>(`${this.api}/stats`, { params });
  }

  getStatusChart(year?: number, month?: number, priorite?: string, equipeId?: number): Observable<ChartData[]> {
    const params = this.buildParams(year, month, priorite, equipeId);
    return this.http.get<ChartData[]>(`${this.api}/reclamations-status`, { params });
  }

  getPrioriteChart(year?: number, month?: number, priorite?: string, equipeId?: number): Observable<ChartData[]> {
    const params = this.buildParams(year, month, priorite, equipeId);
    return this.http.get<ChartData[]>(`${this.api}/reclamations-priorite`, { params });
  }

  getMonthChart(year?: number, month?: number, priorite?: string, equipeId?: number): Observable<ChartData[]> {
    const params = this.buildParams(year, month, priorite, equipeId);
    return this.http.get<ChartData[]>(`${this.api}/reclamations-month`, { params });
  }

  getCategorieChart(year?: number, month?: number, priorite?: string, equipeId?: number): Observable<ChartData[]> {
    const params = this.buildParams(year, month, priorite, equipeId);
    return this.http.get<ChartData[]>(`${this.api}/reclamations-categorie`, { params });
  }
}
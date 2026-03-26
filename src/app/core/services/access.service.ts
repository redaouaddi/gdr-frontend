import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Access } from '../models/access.model';

@Injectable({
  providedIn: 'root'
})
export class AccessService {
  private apiUrl = 'http://localhost:8080/api/admin/accesses';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Access[]> {
    return this.http.get<Access[]>(this.apiUrl);
  }

  create(access: Access): Observable<Access> {
    return this.http.post<Access>(this.apiUrl, access);
  }

  update(id: number, access: Access): Observable<Access> {
    return this.http.put<Access>(`${this.apiUrl}/${id}`, access);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}

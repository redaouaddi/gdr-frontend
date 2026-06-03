import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Access } from '../models/access.model';
import { Page } from '../models/pagination.model';

@Injectable({
  providedIn: 'root'
})
export class AccessService {
  private apiUrl = 'http://localhost:8080/api/admin/accesses';

  constructor(private http: HttpClient) {}

  getAll(page: number = 0, size: number = 10): Observable<Page<Access>> {
    return this.http.get<Page<Access>>(`${this.apiUrl}?page=${page}&size=${size}`);
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

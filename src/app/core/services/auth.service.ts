import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface JwtResponse {
  token: string;
  type: string;
  id: number;
  email: string;
  roles: string[];
  role?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/auth';

  constructor(private http: HttpClient) {}

  login(data: LoginRequest): Observable<JwtResponse> {
    return this.http.post<JwtResponse>(`${this.apiUrl}/signin`, data);
  }

  saveToken(token: string): void {
    localStorage.setItem('token', token);
  }

  saveUser(user: JwtResponse): void {
    localStorage.setItem('user', JSON.stringify(user));
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUser(): JwtResponse | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  normalizeRole(role: string | null | undefined): string {
    return (role || '')
      .replace(/^ROLE_/i, '')
      .trim()
      .toUpperCase();
  }

  getNormalizedRoles(user: (Partial<JwtResponse> & { role?: string }) | null = this.getUser()): string[] {
    if (!user) {
      return [];
    }

    const roles = new Set<string>();
    const pushRole = (value: string | null | undefined) => {
      const normalized = this.normalizeRole(value);
      if (normalized) {
        roles.add(normalized);
      }
    };

    pushRole(user.role);
    (user.roles || []).forEach(pushRole);

    return Array.from(roles);
  }

  hasAnyRole(expectedRoles: string[], user: (Partial<JwtResponse> & { role?: string }) | null = this.getUser()): boolean {
    const userRoles = this.getNormalizedRoles(user);
    return expectedRoles.some(role => userRoles.includes(this.normalizeRole(role)));
  }

  getPrimaryRole(user: (Partial<JwtResponse> & { role?: string }) | null = this.getUser()): string {
    const roles = this.getNormalizedRoles(user);
    const priority = [
      'ADMIN',
      'CONSULTER_RAPPORTS',
      'SERVICE_MANAGER',
      'CHEF_EQUIPE',
      'AGENT',
      'CLIENT',
      'USER'
    ];

    for (const role of priority) {
      if (roles.includes(role)) {
        return role;
      }
    }

    return roles[0] || '';
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
}

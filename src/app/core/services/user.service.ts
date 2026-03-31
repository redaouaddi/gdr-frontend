import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface UserResponse {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  gender: string;
  roles: string[];
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  gender: string;
  roles: string[];
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:8080/api/admin/users';

  constructor(private http: HttpClient) {}

  getAllUsers(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(this.apiUrl);
  }
  

  createUser(data: CreateUserRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(this.apiUrl, data);
  }

  getUserById(id: number): Observable<UserResponse> {
    return this.getAllUsers().pipe(
      map(users => {
        const user = users.find(u => u.id == id);
        if (!user) throw new Error('Utilisateur non trouvé');
        return user;
      })
    );
  }

  updateUser(id: number, data: any): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.apiUrl}/${id}/roles`, { roles: data.roles });
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MessageInterne {
  id: number;
  contenu: string;
  dateEnvoi: string;
  lu: boolean;
  auteurId: number;
  auteurNom: string;
  reclamationId: number;
}

@Injectable({
  providedIn: 'root'
})
export class MessageInterneService {

  private api = 'http://localhost:8080/api/messages-internes';

  constructor(private http: HttpClient) {}

  getMessages(reclamationId: number): Observable<MessageInterne[]> {
    return this.http.get<MessageInterne[]>(
      `${this.api}/reclamation/${reclamationId}`
    );
  }

  envoyerMessage(message: any): Observable<MessageInterne> {
    return this.http.post<MessageInterne>(this.api, message);
  }
}
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Page } from '../models/pagination.model';

export interface MessageInterne {
  id: number;
  contenu: string;
  dateEnvoi: string;
  lu: boolean;
  auteurNom: string;
  reclamationId: number;
}

@Injectable({
  providedIn: 'root'
})
export class MessageInterneService {

  private api = 'http://localhost:8080/api/messages-internes';

  constructor(private http: HttpClient) {}

  getMessages(reclamationId: number, page: number = 0, size: number = 10): Observable<Page<MessageInterne>> {
    return this.http.get<Page<MessageInterne>>(
      `${this.api}/reclamation/${reclamationId}?page=${page}&size=${size}`
    );
  }

  envoyerMessage(reclamationId: number, contenu: string): Observable<MessageInterne> {
    return this.http.post<MessageInterne>(this.api, { reclamationId, contenu });
  }

  envoyerMessageAvecFichier(
  reclamationId: number,
  contenu: string,
  file?: File | null
) {
  const formData = new FormData();

  formData.append('contenu', contenu);

  if (file) {
    formData.append('file', file);
  }

  return this.http.post(
    `${this.api}/${reclamationId}/avec-fichier`,
    formData
  );
}
}
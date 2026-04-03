export interface Reclamation {
  id: number;
  numeroReclamation: string;
  titre: string;
  description: string;
  categorie: string;
  priorite: string;
  statut: string;
  dateCreation: string;
  dateMiseAJour: string;
  motifRefus?: string;
  equipeAssignee?: string;
}

export interface CreateReclamationRequest {
  titre: string;
  description: string;
  categorie: string;
  typeMaintenance?: string;
  sousCategorieIncident?: string;
  detailsAutreIncident?: string;
  priorite: string;
}

export interface ReclamationStatusResponse {
  statut: string;
}

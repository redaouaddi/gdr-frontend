export interface Reclamation {
  id: number;
  numeroReclamation: string;
  titre: string;
  description: string;

  categorie: 'PROJET' | 'MAINTENANCE';
  priorite: 'FAIBLE' | 'MOYENNE' | 'ELEVEE';
  statut: string;

  dateCreation: string;
  dateMiseAJour: string;

  typeMaintenance?: 'INCIDENT' | 'DEMANDE_SERVICE';
  sousCategorieIncident?: 'TECHNIQUE' | 'FACTURATION' | 'SERVICE' | 'AUTRE';
  detailsAutreIncident?: string;

  attachmentName?: string;
  motifRefus?: string;
  equipeAssignee?: string;

  slaDeadline?: string;
  slaStatus?: 'EN_COURS' | 'PROCHE_DEPASSEMENT' | 'DEPASSE' | 'RESPECTE';
  dateResolution?: string;
  clientNom?: string;
}

export interface CreateReclamationRequest {
  titre: string;
  description: string;

  categorie: 'PROJET' | 'MAINTENANCE';
  priorite: 'FAIBLE' | 'MOYENNE' | 'ELEVEE';

  typeMaintenance?: 'INCIDENT' | 'DEMANDE_SERVICE';
  sousCategorieIncident?: 'TECHNIQUE' | 'FACTURATION' | 'SERVICE' | 'AUTRE';
  detailsAutreIncident?: string;
}

export interface ReclamationStatusResponse {
  numeroReclamation: string;
  statut: string;
  dateMiseAJour?: string;

  slaDeadline?: string;
  slaStatus?: 'EN_COURS' | 'PROCHE_DEPASSEMENT' | 'DEPASSE' | 'RESPECTE';
  dateResolution?: string;
}
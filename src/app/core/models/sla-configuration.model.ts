export interface SlaConfiguration {
  id?: number;
  priorite: 'FAIBLE' | 'MOYENNE' | 'ELEVEE';
  delaiHeures: number;
}
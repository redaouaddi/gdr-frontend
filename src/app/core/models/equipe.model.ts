import { UserResponse } from '../services/user.service';

export interface AgentResponse {
  id: number;
  prenom: string;
  nom: string;
  email: string;
}

export interface Equipe {
  id?: number;
  nom: string;
  chefEmail: string;
  chefEquipeNom: string;
  chefEquipeId?: number;
  agents: AgentResponse[];
}

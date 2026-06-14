export interface AuditLog {
  id: number;
  actorEmail: string;
  actorName: string;
  role: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
  timestamp: string;
}

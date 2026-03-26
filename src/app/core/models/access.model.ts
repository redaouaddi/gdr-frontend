export enum EPermission {
  READ_CLAIMS = 'READ_CLAIMS',
  WRITE_CLAIMS = 'WRITE_CLAIMS',
  DELETE_CLAIMS = 'DELETE_CLAIMS',
  ASSIGN_CLAIMS = 'ASSIGN_CLAIMS',
  READ_USERS = 'READ_USERS',
  WRITE_USERS = 'WRITE_USERS',
  DELETE_USERS = 'DELETE_USERS',
  MANAGE_ACCESS = 'MANAGE_ACCESS',
  VIEW_REPORTS = 'VIEW_REPORTS'
}

export interface Access {
  id?: number;
  name: string;
  permissions: EPermission[];
  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;
}

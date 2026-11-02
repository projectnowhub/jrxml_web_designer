// cdp-fe-app Entities/Role/role.entity.ts and permissions.ts
import type { BaseEntity } from "./base";

export interface EntityAction {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export interface RoleEntity {
  id: string;
  entityName: string;
  name: string;
  action: EntityAction;
  immutableAction: (keyof EntityAction)[];
  parentEntityName: string | null;
  alias: string | null;
}

export interface Role extends BaseEntity {
  code: string;
  name: string;
  description: string;
  system: boolean;
  entity?: RoleEntity[];
}

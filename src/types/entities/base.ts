// CDP entity types, copied from cdp-fe-app (packages/core/types/src/Entities),
// field for field, so the designer reads the backend's answers the same way.
// Its enums are const objects here (this project compiles with
// erasableSyntaxOnly); a type of the same name lists their values.

// cdp-fe-app Entities/shared/base.types.ts
export interface BaseEntity {
  id: string;
  tenant: string;
  createdBy: string;
  createdDate: string;
  lastModifiedBy: string;
  lastModifiedDate: string;
  version: number;
}

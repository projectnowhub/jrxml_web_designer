// cdp-fe-app Entities/BaselineType/baselineType.entity.ts
import type { BaseEntity } from "./base";

export interface BaselineType extends BaseEntity {
  name: string;
  color: string;
}

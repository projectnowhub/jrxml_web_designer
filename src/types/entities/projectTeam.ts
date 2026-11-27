// cdp-fe-app Entities/ProjectTeam/projectTeam.entity.ts
import type { BaseEntity } from "./base";

export interface ProjectTeam extends BaseEntity {
  name: string;
  mobileNo: string;
  dialCode: string;
  country: string;
  email: string;
  designation: string;
}

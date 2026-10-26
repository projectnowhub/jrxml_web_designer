// cdp-fe-app Entities/User/user.entity.ts
import type { BaseEntity } from "./base";

export interface User extends BaseEntity {
  firstName: string;
  lastName?: string;
  mobileNo: string;
  dialCode: string;
  country: string;
  email: string;
  role: string;
  roleName: string;
  active: boolean;
  isOrganizationAdmin: boolean;
  _entityName?: string;
  _instanceName?: string;
}

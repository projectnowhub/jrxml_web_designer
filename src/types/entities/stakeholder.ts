// cdp-fe-app Entities/Stakeholder/stakeholder.entity.ts
import type { BaseEntity } from "./base";

export interface ContactPerson {
  id?: string;
  name: string;
  email: string;
  dialCode: string;
  country: string;
  mobileNo: string;
  designation: string;
}

export interface BusinessType {
  id: string;
  name: string;
  tenant: string;
  isDefault: boolean;
  createdBy: string;
  _entityName?: string;
  _instanceName?: string;
}

export interface Stakeholder extends BaseEntity {
  name: string;
  email: string;
  mobileNo: string;
  country: string;
  dialCode: string;
  website?: string;
  businessTypes: BusinessType[];
  contactPersons: ContactPerson[];
  _entityName?: string;
  _instanceName?: string;
  nameLowerCase?: string;
}

export type Company = Stakeholder;

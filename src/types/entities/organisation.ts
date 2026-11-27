// cdp-fe-app Entities/Organisation/organisation.entity.ts
import type { BaseEntity } from "./base";

export interface Plan {
  id: string;
  name: string;
  allottedProjectCount: number;
  allottedUserCount: number;
}

export interface Subscription {
  id: string;
  price: number;
  startDate: string;
  endDate: string;
  status: string;
  projectCount: number;
  userCount: number;
  plan: Plan;
  tenant: string;
}

export interface Organisation extends BaseEntity {
  name: string;
  email: string;
  mobileNo: string;
  secondaryMobileNo: string;
  website: string;
  dialCode: string | null;
  secondaryDialCode: string | null;
  companySSMNo: string | null;
  msicCode: string | null;
  sstNo: string | null;
  tinNo: string | null;
  contractAdminFirstName: string;
  contractAdminLastName: string | null;
  logo: string | null;
  activeSubscription: Subscription;
  country: string | null;
  secondaryCountry: string | null;
}

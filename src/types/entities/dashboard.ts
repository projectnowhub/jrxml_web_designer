// cdp-fe-app dashboard.types.ts
import type { ProjectSourceInfo } from "./projectSourceInfo";

export interface P6Dashboard {
  id: string;
  name: string;
  nameLowerCase?: string;
  description?: string;
  createdBy?: string;
  createdDate: Date;
  project: { id: string };
  // projectReports?: Array<any>;
  tenant: string;
  lastModifiedBy?: string;
  lastModifiedDate?: Date;
  version: number;
  projectSourceInfo: ProjectSourceInfo;
  isFavourite?: boolean;
}

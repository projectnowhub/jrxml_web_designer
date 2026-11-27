// cdp-fe-app Entities/Project/project.entity.ts: what GET /v2/table/cdp_Project
// sends with fetch plan project-details-fp (the whole project)
import type { BaseEntity } from "./base";
import type { Contract } from "./contract";
import type { P6Dashboard } from "./dashboard";
import type { FileTag } from "./fileTag";
import type { ProgressFile } from "./progressFile";
import type { ProjectHistory } from "./projectHistory";
import type { ProjectTeam } from "./projectTeam";
import type { Stakeholder } from "./stakeholder";
import type { User } from "./user";

export const PROJECT_STATUS = {
  PLANNED: "PLANNED",
  TENDERING: "TENDERING",
  ACTIVE: "ACTIVE",
  ON_HOLD: "ON_HOLD",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type PROJECT_STATUS = (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS];

export interface Project extends BaseEntity {
  projectId: string;
  projectLocation: string;
  status: PROJECT_STATUS;
  isArchive?: boolean;
  country: string;
  city: string;
  latitude: string;
  longitude: string;
  description: string;
  contractualMilestones: string;
  state: string;
  projectTitleLowerCase: string;
  projectTitle: string;
  projectScope: string;
  projectManager: ProjectTeam;
  contracts: Contract[];
  startDate?: string;
  finishDate?: string;
  parent?: {
    id: string;
  };
  projectTeams: ProjectTeam[];
  users: User[];
  companies: Stakeholder[];
  refImages: FileTag[];
  children?: Project[];
  projectSnapshot: {
    latestBaselineProgressFile: ProgressFile;
    latestUpdatedProgressFile: ProgressFile;
    latestProjectHistory: ProjectHistory;
    latestDashboard: P6Dashboard;
    latestEOTRevisedCompletionDate?: string;
    riskScore?: number;
  };
}

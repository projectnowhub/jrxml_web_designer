// cdp-fe-app Entities/ProjectHistory/projectHistory.entity.ts
import type { BaseEntity } from "./base";
import type { ProjectSourceInfo } from "./projectSourceInfo";

export interface ProjectHistory extends BaseEntity {
  project: { id: string };
  projectSummary: string;
  aiTokenDetail?: unknown;
  projectSourceInfo: ProjectSourceInfo;
  // from `projectHistory-fetch-plan` (historyLayouts: _instance_name)
  historyLayouts?: { id: string; name: string }[];
}

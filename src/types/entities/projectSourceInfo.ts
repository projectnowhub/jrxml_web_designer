// cdp-fe-app Entities/ProjectSourceInfo/projectSourceInfo.entity.ts
import type { BaseEntity } from "./base";
import type { P6Dashboard } from "./dashboard";
import type { Job } from "./job";
import type { ProgressFile } from "./progressFile";
import type { ProjectHistory } from "./projectHistory";

export const ProjectType = {
  BASELINE_PROJECT: "BASELINE_PROJECT",
  UPDATED_PROJECT: "UPDATED_PROJECT",
} as const;
export type ProjectType = (typeof ProjectType)[keyof typeof ProjectType];

export const SourceFormat = {
  XML: "XML",
  XER: "XER",
  SQLITE: "SQLite",
  MPP: "MPP",
  MSP: "MSP",
  MSSQL: "MsSQL",
} as const;
export type SourceFormat = (typeof SourceFormat)[keyof typeof SourceFormat];

export const SourceApplication = {
  PRIMAVERA: "PRIMAVERA",
  MICROSOFT_PROJECT: "MICROSOFT_PROJECT",
  DATABASE: "DATABASE",
} as const;
export type SourceApplication = (typeof SourceApplication)[keyof typeof SourceApplication];

export interface ProjectSourceInfo extends BaseEntity {
  _instanceName?: string;

  earnedValueCost: number;
  actualCost: number;
  plannedValueCost: number;
  budgetedTotalCost: number;
  spi: number;
  cpi: number;
  schedulePercentage: number;
  actualPercentage: number;
  scheduleVariance: number;
  costVariance: number;
  delayDays: number;

  baselineProgressFile: ProgressFile;
  updatedProgressFile: ProgressFile;

  dashboard?: P6Dashboard;
  projectHistory?: ProjectHistory;

  currentJob?: Job;
  jobs?: Job[];
  executionMonitors?: unknown[];
  logs?: unknown[];

  creationSource: string;
}

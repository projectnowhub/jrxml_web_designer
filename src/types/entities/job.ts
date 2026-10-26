// cdp-fe-app Entities/Job/job.entity.ts
import type { BaseEntity } from "./base";

export const JOB_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  FAILED: "FAILED",
  CORRUPTED: "CORRUPTED",
  READY: "READY",
  PARSING: "PARSING",
  INDEXING: "INDEXING",
} as const;
export type JOB_STATUS = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

export interface Job extends BaseEntity {
  lastModifiedDate: string;
  lastModifiedBy: string;
  noOfRetry: number;
  version: number;
  createdDate: string;
  createdBy: string;
  startTime: string;
  tenant: string;
  status: JOB_STATUS;
}

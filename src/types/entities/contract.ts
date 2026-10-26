// cdp-fe-app Entities/Contract/contract.entity.ts
import type { BaseEntity } from "./base";

export const PerformanceBondType = {
  CASH: "CASH",
  BANK_GUARANTEE: "BANK_GUARANTEE",
  NOT_REQUIRED: "NOT_REQUIRED",
} as const;
export type PerformanceBondType = (typeof PerformanceBondType)[keyof typeof PerformanceBondType];

export const contractType = {
  PAM: "PAM",
  CIDB: "CIDB",
  JKR: "JKR",
  FIDIC: "FIDIC",
} as const;
export type contractType = (typeof contractType)[keyof typeof contractType];

export interface Contract extends BaseEntity {
  contractName: string;
  contractNumber: string;
  contractType: contractType;
  originalContractSum: number;
  approvedVariationOrders: number;
  adjustedContractSum: number;
  retentionPercentage: number;
  retentionSum: number;
  retentionHeldToDate: number;
  retentionReleasedAtCPC: number;
  retentionReleasedAtFinalAccount: number;
  performanceBondAmount: number;
  performanceBondType: PerformanceBondType;
  totalNetPaymentReceived: number;
  contractStartDate: string;
  contractFinishDate: string;
  project: { id: string };
  createdAt: Date;
  updatedAt: Date;
}

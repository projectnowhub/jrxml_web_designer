// The fields a chart may use for each CDP entity, copied field for field from
// the CDP app's dashboard field lists (cdp-fe-app packages/modules/*/src/
// *.dashboardFields.ts, e.g. QAQC_FIELD_MANIFEST), in their order: which can
// group the chart (X-axis / categories, split by, tree map levels), which can
// be added up (Sum / Avg / Min / Max) and which can filter. Entities without a
// list here have no CDP dashboard; their charts offer the source's columns.
// Labels: chartFields.<entity>.<key> in the locale files ("." in a key is "_").
// No browser code (the report engine may bundle this file).

import { Entity } from "@/enums/entityName";
import type { ChartFieldRule } from "@/types/dataSource";

export const CHART_FIELDS: Readonly<Record<string, readonly ChartFieldRule[]>> = {
  [Entity.COMPLIANCE_REGISTER]: [
    { key: "complianceItem", type: "text", groupBy: false, measurable: false, filterable: true },
    { key: "category", type: "enum", groupBy: true, measurable: false, filterable: true },
    { key: "issuingAuthority", type: "enum", groupBy: true, measurable: false, filterable: true },
    { key: "status", type: "enum", groupBy: true, measurable: false, filterable: true },
    { key: "depositAmount", type: "number", groupBy: false, measurable: true, filterable: true },
    { key: "submissionDate", type: "date", groupBy: true, measurable: false, filterable: true },
    { key: "expiryDate", type: "date", groupBy: true, measurable: false, filterable: true },
  ],
  [Entity.EOT_ENTRY]: [
    { key: "claimId", type: "text", groupBy: false, measurable: false, filterable: true },
    { key: "submissionDate", type: "date", groupBy: true, measurable: false, filterable: true },
    { key: "status", type: "enum", groupBy: true, measurable: false, filterable: true },
    { key: "causeCategory", type: "text", groupBy: true, measurable: false, filterable: true },
    { key: "responsibility", type: "text", groupBy: true, measurable: false, filterable: true },
    { key: "daysRequested", type: "number", groupBy: false, measurable: true, filterable: true },
    { key: "daysApproved", type: "number", groupBy: false, measurable: true, filterable: true },
    { key: "claimAgeing", type: "number", groupBy: false, measurable: true, filterable: true },
    { key: "costImplication", type: "number", groupBy: false, measurable: true, filterable: true },
    { key: "revisedCompletionDate", type: "date", groupBy: true, measurable: false, filterable: true },
    { key: "approvalDate", type: "date", groupBy: true, measurable: false, filterable: true },
    { key: "impactOnCriticalPath", type: "boolean", groupBy: true, measurable: false, filterable: true },
    { key: "linkedCostClaim", type: "boolean", groupBy: true, measurable: false, filterable: true },
    { key: "delayAnalysisMethod", type: "text", groupBy: true, measurable: false, filterable: true },
  ],
  [Entity.INCIDENT_REGISTER]: [
    { key: "incidentId", type: "text", groupBy: false, measurable: false, filterable: true },
    { key: "dateOfIncident", type: "date", groupBy: true, measurable: false, filterable: true },
    { key: "location", type: "text", groupBy: true, measurable: false, filterable: true },
    { key: "reportedBy", type: "text", groupBy: true, measurable: false, filterable: true },
    { key: "incidentType", type: "text", groupBy: true, measurable: false, filterable: true },
    { key: "personResponsible", type: "text", groupBy: true, measurable: false, filterable: true },
    { key: "targetClosureDate", type: "date", groupBy: true, measurable: false, filterable: true },
    { key: "dateClosed", type: "date", groupBy: true, measurable: false, filterable: true },
    { key: "status", type: "enum", groupBy: true, measurable: false, filterable: true },
    { key: "severityLevel", type: "enum", groupBy: true, measurable: false, filterable: true },
    { key: "injuryType", type: "enum", groupBy: true, measurable: false, filterable: true },
    { key: "lostTimeInjury", type: "enum", groupBy: true, measurable: false, filterable: true },
    { key: "impactHours", type: "number", groupBy: false, measurable: true, filterable: true },
  ],
  [Entity.ISSUE_REGISTER]: [
    { key: "raisedDate", type: "date", groupBy: true, measurable: false, filterable: true },
    { key: "status", type: "enum", groupBy: true, measurable: false, filterable: true },
    { key: "priority", type: "enum", groupBy: true, measurable: false, filterable: true },
    { key: "targetResolutionDate", type: "date", groupBy: true, measurable: false, filterable: true },
    { key: "costImpact", type: "number", groupBy: false, measurable: true, filterable: true },
  ],
  [Entity.LAD_REPORT]: [
    { key: "ladId", type: "text", groupBy: false, measurable: false, filterable: true },
    { key: "contractTitle", type: "text", groupBy: true, measurable: false, filterable: true },
    { key: "contractValue", type: "number", groupBy: false, measurable: true, filterable: true },
    { key: "contractFinishDate", type: "date", groupBy: true, measurable: false, filterable: true },
    { key: "actualFinishDate", type: "date", groupBy: true, measurable: false, filterable: true },
    { key: "delayDuration", type: "number", groupBy: false, measurable: true, filterable: true },
    { key: "deductionUnit", type: "enum", groupBy: true, measurable: false, filterable: true },
    { key: "deductionValue", type: "number", groupBy: false, measurable: true, filterable: true },
    { key: "dailyAmount", type: "number", groupBy: false, measurable: true, filterable: true },
    { key: "potentialAmount", type: "number", groupBy: false, measurable: true, filterable: true },
  ],
  [Entity.PROCUREMENT_REGISTER]: [
    { key: "packageOrItemCode", type: "text", groupBy: false, measurable: false, filterable: true },
    { key: "itemName", type: "text", groupBy: true, measurable: false, filterable: true },
    { key: "supplier.name", type: "text", groupBy: true, measurable: false, filterable: true },
    { key: "needByDate", type: "date", groupBy: true, measurable: false, filterable: true },
    { key: "poDate", type: "date", groupBy: true, measurable: false, filterable: true },
    { key: "actualDelivery", type: "date", groupBy: true, measurable: false, filterable: true },
    { key: "status", type: "enum", groupBy: true, measurable: false, filterable: true },
    { key: "leadTime", type: "number", groupBy: false, measurable: true, filterable: true },
    { key: "varianceDays", type: "number", groupBy: false, measurable: true, filterable: true },
    { key: "budgetCost", type: "number", groupBy: false, measurable: true, filterable: true },
    { key: "poValue", type: "number", groupBy: false, measurable: true, filterable: true },
    { key: "cost", type: "number", groupBy: false, measurable: true, filterable: true },
  ],
  [Entity.QAQC_REGISTER]: [
    { key: "qaQcReportNo", type: "text", groupBy: false, measurable: false, filterable: true },
    { key: "inspectionDate", type: "date", groupBy: true, measurable: false, filterable: true },
    { key: "inspectionType", type: "enum", groupBy: true, measurable: false, filterable: true },
    { key: "result", type: "enum", groupBy: true, measurable: false, filterable: true },
    { key: "ncrStatus", type: "enum", groupBy: true, measurable: false, filterable: true },
    { key: "approvedBy", type: "text", groupBy: true, measurable: false, filterable: true },
    { key: "testConducted", type: "text", groupBy: false, measurable: false, filterable: true },
    { key: "remarks", type: "text", groupBy: false, measurable: false, filterable: true },
  ],
  [Entity.QUALITY_STANDARD_AUDIT]: [
    { key: "inspectionDate", type: "date", groupBy: true, measurable: false, filterable: true },
    { key: "inspectedBy", type: "text", groupBy: true, measurable: false, filterable: true },
    { key: "qlassicScore", type: "number", groupBy: false, measurable: true, filterable: true },
    { key: "qsScore", type: "number", groupBy: false, measurable: true, filterable: true },
    { key: "actualScore", type: "number", groupBy: false, measurable: true, filterable: true },
  ],
  [Entity.RISK_REGISTER]: [
    { key: "riskCategory", type: "text", groupBy: true, measurable: false, filterable: true },
    { key: "riskOwner", type: "text", groupBy: true, measurable: false, filterable: true },
    { key: "status", type: "enum", groupBy: true, measurable: false, filterable: true },
    { key: "responseStrategy", type: "enum", groupBy: true, measurable: false, filterable: true },
    { key: "riskRating", type: "enum", groupBy: true, measurable: false, filterable: true },
    { key: "likelihood", type: "number", groupBy: false, measurable: true, filterable: true },
    { key: "consequence", type: "number", groupBy: false, measurable: true, filterable: true },
    { key: "riskLevel", type: "number", groupBy: false, measurable: true, filterable: true },
    { key: "finalRisk", type: "number", groupBy: false, measurable: true, filterable: true },
    { key: "dateIdentified", type: "date", groupBy: true, measurable: false, filterable: true },
    { key: "nextReviewDate", type: "date", groupBy: true, measurable: false, filterable: true },
  ],
  [Entity.SAFETY_HEALTH_AUDIT]: [
    { key: "inspectionDate", type: "date", groupBy: true, measurable: false, filterable: true },
    { key: "inspectedBy", type: "text", groupBy: true, measurable: false, filterable: true },
    { key: "shhScore", type: "number", groupBy: false, measurable: true, filterable: true },
    { key: "actualScore", type: "number", groupBy: false, measurable: true, filterable: true },
  ],
};

// The colour the CDP app gives each value of a choice field in its dashboards
// (the option lists' colour, resolveSemanticColor: success #10b981, warning
// #f59e0b, danger #ef4444, info #3b82f6, default #9ca3af): a chart's starting
// colours for those values; the user's own colours come over them
export const CHART_VALUE_COLORS: Readonly<Record<string, Readonly<Record<string, Readonly<Record<string, string>>>>>> = {
  [Entity.COMPLIANCE_REGISTER]: {
    category: { REGULATORY: "#3b82f6", CONSTRUCTION_PERMIT: "#f59e0b", INSURANCE: "#8b5cf6", STATUTORY: "#ef4444" },
    issuingAuthority: { LOCAL_AUTHORITY: "#3b82f6", TOWN_PLANNING_DEPARTMENT: "#8b5cf6", IRRIGATION_DEPT_JPS: "#06b6d4", DOSH: "#f59e0b", INSURANCE_PROVIDER: "#ec4899", CIDB: "#10b981", KWSP: "#6366f1", IMMIGRATION_DEPT: "#f97316" },
    status: { OPEN: "#3b82f6", IN_PROGRESS: "#f59e0b", ON_HOLD: "#9ca3af", CLOSED: "#10b981" },
  },
  [Entity.INCIDENT_REGISTER]: {
    status: { OPEN: "#3b82f6", IN_PROGRESS: "#f59e0b", ON_HOLD: "#9ca3af", CLOSED: "#10b981" },
    severityLevel: { VERY_LOW: "#9ca3af", LOW: "#3b82f6", MODERATE: "#f59e0b", HIGH: "#f97316", VERY_HIGH: "#ef4444" },
    injuryType: { YES: "#10b981", NO: "#9ca3af" },
    lostTimeInjury: { YES: "#10b981", NO: "#9ca3af" },
  },
  [Entity.EOT_ENTRY]: {
    status: { APPROVED: "#16a34a", REJECTED: "#dc2626", PENDING: "#f59e0b", UNDER_REVIEW: "#2563eb" },
  },
  [Entity.RISK_REGISTER]: {
    status: { OPEN: "#3b82f6", IN_PROGRESS: "#f59e0b", ON_HOLD: "#9ca3af", CLOSED: "#10b981" },
    responseStrategy: { MITIGATE: "#10b981", ACCEPT: "#9ca3af", TRANSFER: "#3b82f6", AVOID: "#f59e0b" },
  },
  [Entity.LAD_REPORT]: {
    deductionUnit: { PERCENTAGE: "#4caf50", AMOUNT: "#2196f3" },
  },
  [Entity.QAQC_REGISTER]: {
    result: { PASS: "#10b981", FAIL: "#ef4444", PENDING: "#f59e0b", DELAY: "#9ca3af" },
    ncrStatus: { NONE: "#9ca3af", OPEN: "#f59e0b", CLOSED: "#10b981" },
  },
  [Entity.ISSUE_REGISTER]: {
    status: { OPEN: "#2196f3", IN_PROGRESS: "#ff9800", PENDING_APPROVAL: "#9c27b0", ON_HOLD: "#9e9e9e", CLOSED: "#4caf50" },
    priority: { LOW: "#4caf50", MEDIUM: "#2196f3", HIGH: "#ff9800", CRITICAL: "#f44336" },
  },
};

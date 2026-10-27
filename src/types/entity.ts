// CDP entity names, as cdp-fe-app's Entity enum (packages/core/types/src/entity.ts)
// names them. A const object instead of an enum: this project compiles with
// erasableSyntaxOnly, which doesn't allow enums. Used the same way (Entity.PROJECT).
export const Entity = {
  PROJECT: "cdp_Project",
  HISTORY: "cdp_ProjectHistory",
  HISTORY_LAYOUT: "cdp_HistoryLayout",
  PROGRESS_FILE: "cdp_ProgressFile",
  PROJECT_SOURCE_INFO: "cdp_ProjectSourceInfo",
  BASELINE_TYPE: "cdp_BaselineType",
  LAD_REPORT: "cdp_LADReport",
  EOT_ENTRY: "cdp_EOTEntry",
  PROCUREMENT_REGISTER: "cdp_ProcurementRegister",
  COMPLIANCE_REGISTER: "cdp_ContractionComplianceRegister",
  INCIDENT_REGISTER: "cdp_SHEIncidentRegister",
  RISK_REGISTER: "cdp_RiskRegister",
  QAQC_REGISTER: "cdp_QaQcRegister",
  PROJECT_AUDIT: "cdp_QsheProjectAudit",
  QUALITY_STANDARD_AUDIT: "cdp_QsheQualityStandardAudit",
  SAFETY_HEALTH_AUDIT: "cdp_QsheSafetyHealthHousekeepingAudit",
  ISSUE_REGISTER: "cdp_IssueRegister",
  ISSUE_CATEGORY: "cdp_IssueCategory",
  ISSUE_TYPE: "cdp_IssueType",
  STAKEHOLDER: "cdp_Company",
  PROJECT_TEAM: "cdp_ProjectTeam",
  ORGANIZATION: "cdp_Organization",
  USER: "cdp_User",
  ROLE: "sec_ResourceRoleEntity",
  CONTRACT: "cdp_Contract",
  PAYMENT: "cdp_Payment",
  VARIATION_ORDER: "cdp_VariationOrder",
  FINAL_ACCOUNT: "cdp_FinalAccount",
  USER_MODULES_DASHBOARD_LAYOUT: "cdp_UserModulesDashboardLayout",
} as const;

export type Entity = (typeof Entity)[keyof typeof Entity];

// Entities whose records belong to a contract, not straight to a project: their
// project is reached through the contract, as the CDP app's payment, variation
// order, final account and LAD lists filter them ('contract.project.id')
const CONTRACT_ENTITIES: readonly string[] = [
  Entity.PAYMENT,
  Entity.VARIATION_ORDER,
  Entity.FINAL_ACCOUNT,
  Entity.LAD_REPORT,
];

// The property that holds an entity's project id in a Jmix filter
export const projectPropertyOf = (entityName: string): string =>
  CONTRACT_ENTITIES.includes(entityName) ? "contract.project.id" : "project.id";

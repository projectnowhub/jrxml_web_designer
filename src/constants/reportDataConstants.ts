// Report Data constants: page sizes, fetch plans and the entities read
// through a contract. No browser code (the report engine bundles this file).

import { Entity } from "@/enums/entityName";

// The page size the CDP app's lists use (every project request asks for this)
export const JMIX_PAGE_SIZE = 30;

// Rows the designer asks for a table by default (one request: the canvas, the
// preview window, the setup popup's first page); the PDF reads every row itself
export const TABLE_ROWS_LIMIT = 25;

// Rows per page in the setup popup's grid (as the CDP app's tables page)
export const TABLE_PAGE_SIZES: readonly number[] = [25, 50, 100];

// The most rows one request asks for (the largest page)
export const TABLE_MAX_PAGE_SIZE = 100;

// The project fetch plan: the whole project (what the CDP app's project page
// reads), so the list's rows already hold everything Report Data shows
export const PROJECT_DETAILS_FETCH_PLAN = "project-details-fp";

// The fetch plans the CDP app's lists ask for. Every other list there sends
// none, so the server uses its default plan (the entity's own fields). Asking
// for a plan the server doesn't have fails (500 "FetchPlan … not found"), so
// only these are named.
export const LIST_FETCH_PLANS: Readonly<Record<string, string>> = {
  [Entity.PROCUREMENT_REGISTER]: "procurementRegister-list-fp",
  [Entity.RISK_REGISTER]: "riskRegister-list-fp",
  [Entity.QAQC_REGISTER]: "qaQcRegister-list-fp",
  [Entity.ISSUE_REGISTER]: "issueRegister-list-fp",
  [Entity.PROJECT]: "project-list-fp",
  [Entity.STAKEHOLDER]: "company-list-fp",
};

// Entities whose records belong to a contract, not straight to a project:
// their project is reached through the contract, as the CDP app's payment,
// variation order, final account and LAD lists filter them
export const CONTRACT_ENTITIES: readonly string[] = [
  Entity.PAYMENT,
  Entity.VARIATION_ORDER,
  Entity.FINAL_ACCOUNT,
  Entity.LAD_REPORT,
];

// The property holding a record's project id
export const PROJECT_ID_PROPERTY = "project.id";
export const CONTRACT_PROJECT_ID_PROPERTY = "contract.project.id";

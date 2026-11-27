// The project's tables in the CDP app's order: its project sidebar
// (cdp-fe-app apps/cdp-contractor/src/pages/Projects/project.sidebar.ts),
// each heading and sub-heading with the tables (entities) under it, named as
// the sidebar names them. Report Data and the setup popups list the tables
// this way (utils/table/tableGroups.ts); texts reportData.tableGroups.*,
// reportData.tableSections.*, reportData.tableNames.* (the CDP words). The
// sidebar's pages without a table (Overview's AI, Dashboards, History,
// Photos, Video) are left out.

import { Entity } from "@/enums/entityName";

export interface CdpTableSection {
  // A sub-heading ("Contract Monitoring"); none = the tables sit right under the heading
  key?: string;
  tables: { entity: string; name: string }[];
}

export interface CdpTableGroup {
  key: string;
  sections: CdpTableSection[];
}

export const CDP_TABLE_GROUPS: CdpTableGroup[] = [
  {
    key: "projectInformation",
    sections: [
      {
        tables: [
          // Hidden in this version (HIDDEN_TABLE_ENTITIES in reportDataConstants.ts)
          { entity: Entity.PROJECT, name: "project" },
          { entity: Entity.PROGRESS_FILE, name: "progressFiles" },
        ],
      },
    ],
  },
  {
    key: "contractManagement",
    sections: [
      {
        key: "contractMonitoring",
        tables: [
          { entity: Entity.CONTRACT, name: "contract" },
          { entity: Entity.PAYMENT, name: "payment" },
          { entity: Entity.VARIATION_ORDER, name: "variationOrder" },
          { entity: Entity.FINAL_ACCOUNT, name: "finalAccount" },
          { entity: Entity.LAD_REPORT, name: "lad" },
        ],
      },
      { tables: [{ entity: Entity.EOT_ENTRY, name: "eot" }] },
    ],
  },
  {
    key: "procurementManagement",
    sections: [{ tables: [{ entity: Entity.PROCUREMENT_REGISTER, name: "procurementRegister" }] }],
  },
  {
    key: "complianceManagement",
    sections: [{ tables: [{ entity: Entity.COMPLIANCE_REGISTER, name: "complianceRegister" }] }],
  },
  {
    key: "sheManagement",
    sections: [{ tables: [{ entity: Entity.INCIDENT_REGISTER, name: "incidentRegister" }] }],
  },
  {
    key: "riskManagement",
    sections: [{ tables: [{ entity: Entity.RISK_REGISTER, name: "riskRegister" }] }],
  },
  {
    key: "qsheManagement",
    sections: [
      {
        key: "qsheAudit",
        tables: [
          { entity: Entity.PROJECT_AUDIT, name: "projectAudit" },
          { entity: Entity.QUALITY_STANDARD_AUDIT, name: "qualityStandard" },
          { entity: Entity.SAFETY_HEALTH_AUDIT, name: "safetyHealth" },
        ],
      },
    ],
  },
  {
    key: "qualityManagement",
    sections: [{ tables: [{ entity: Entity.QAQC_REGISTER, name: "qaqcRegister" }] }],
  },
  {
    key: "issueManagement",
    sections: [{ tables: [{ entity: Entity.ISSUE_REGISTER, name: "issueRegister" }] }],
  },
];

// Tables the sidebar doesn't list go last, under this heading
export const OTHER_TABLES_GROUP = "otherTables";

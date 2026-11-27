// A project's tables grouped and named as the CDP app's project sidebar
// (constants/tableGroupConstants.ts): Report Data's list and the setup
// popups' table choice. Only the tables the project has; empty headings go.

import i18n from "@/i18n";
import { CDP_TABLE_GROUPS, OTHER_TABLES_GROUP } from "@/constants/tableGroupConstants";
import type { DataSourceSummary } from "@/types/dataSource";

export interface NamedTable extends DataSourceSummary {
  // The name shown: the CDP sidebar's, else the table's own
  label: string;
}

export interface TableListSection {
  key: string;
  // The sub-heading ("Contract Monitoring"), when there is one
  title?: string;
  tables: NamedTable[];
}

export interface TableListGroup {
  key: string;
  title: string;
  sections: TableListSection[];
}

const t = (key: string) => i18n.global.t(key);

// The CDP sidebar's name of a table (by its entity), else its own name
export function cdpTableName(entityName: string | undefined, fallback: string): string {
  for (const group of CDP_TABLE_GROUPS) {
    for (const section of group.sections) {
      const table = section.tables.find((item) => item.entity === entityName);
      if (table) return t(`reportData.tableNames.${table.name}`);
    }
  }
  return fallback;
}

// The tables under the CDP headings, in its order; the rest last, A to Z
export function groupTablesLikeCdp(sources: DataSourceSummary[]): TableListGroup[] {
  const byId = new Map(sources.map((s) => [s.id, s]));
  const placed = new Set<string>();
  const groups: TableListGroup[] = [];
  for (const group of CDP_TABLE_GROUPS) {
    const sections = group.sections
      .map((section, i) => ({
        key: section.key ?? `${group.key}-${i}`,
        ...(section.key ? { title: t(`reportData.tableSections.${section.key}`) } : {}),
        tables: section.tables.flatMap((item) => {
          const source = byId.get(item.entity);
          if (!source) return [];
          placed.add(source.id);
          // Its name is the CDP one everywhere it goes (drag, chart, the setup popup)
          const label = t(`reportData.tableNames.${item.name}`);
          return [{ ...source, name: label, label }];
        }),
      }))
      .filter((section) => section.tables.length);
    if (sections.length) groups.push({ key: group.key, title: t(`reportData.tableGroups.${group.key}`), sections });
  }
  const rest = sources
    .filter((s) => !placed.has(s.id))
    .map((s) => ({ ...s, label: s.name }))
    .sort((a, b) => a.label.localeCompare(b.label));
  if (rest.length) {
    groups.push({
      key: OTHER_TABLES_GROUP,
      title: t(`reportData.tableGroups.${OTHER_TABLES_GROUP}`),
      sections: [{ key: OTHER_TABLES_GROUP, tables: rest }],
    });
  }
  return groups;
}

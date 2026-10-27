// Entity mappers: a CDP entity (from GET /v2/entities) as a project-data
// table: its name, its columns (base fields, then user-defined ones, or the
// user's order from the CDP app, stores/columnOrder.ts) and how
// each column is filtered. No API calls here: the request is in
// services/reportDataService.ts.

import type { EntityFieldMetadata, EntityMetadata } from "@/types/entityMetadata";
import type { ColumnFacet, DataColumn, DataColumnType, DataSourceSchema, DataSourceSummary, SourceFacets } from "@/types/dataSource";

const NUMBER_TYPES = new Set(["double", "integer", "int", "long", "short", "float", "decimal", "bigdecimal", "biginteger", "number"]);
const DATE_TYPES = new Set([
  "localdate",
  "localdatetime",
  "offsetdatetime",
  "zoneddatetime",
  "date",
  "datetime",
  "date_without_time",
  "date_with_time",
  "time",
  "localtime",
]);

// How a field's values are shown and filtered
function toColumnType(dataType: string): DataColumnType {
  const type = dataType.toLowerCase();
  if (NUMBER_TYPES.has(type)) return "number";
  if (DATE_TYPES.has(type)) return "date";
  return "text";
}

const BOOLEAN_TYPES = new Set(["boolean", "bool"]);

const isLinkField = (field: EntityFieldMetadata) => field.dataType.toUpperCase() === "ENTITY";

// A field a table column can show: one value per row (a link to another
// record shows its name; lists of records are left out)
const isColumnField = (field: EntityFieldMetadata) => !field.collection;

// A field the table can be filtered on (not a link: Jmix compares a link's id)
const isFilterField = (field: EntityFieldMetadata) => isColumnField(field) && !isLinkField(field);

const toDataColumn = (field: EntityFieldMetadata, userDefined: boolean): DataColumn => ({
  key: field.fieldName,
  label: field.name || field.fieldName,
  type: isLinkField(field) ? "text" : toColumnType(field.dataType),
  ...(userDefined ? { userDefined } : {}),
  ...(isLinkField(field) ? { linked: true } : {}),
  ...(field.enumValues?.length && !isLinkField(field)
    ? { choices: field.enumValues.map((value) => ({ value: storedEnumValue(value), label: enumLabel(value) })) }
    : {}),
  ...(BOOLEAN_TYPES.has(field.dataType.toLowerCase()) ? { yesNo: true } : {}),
});

// Base fields first, then the tenant's own (user-defined) ones, each in the backend's order
function entityColumns(entity: EntityMetadata): DataColumn[] {
  return [
    ...(entity.baseFields ?? []).filter(isColumnField).map((f) => toDataColumn(f, false)),
    ...(entity.userDefinedFields ?? []).filter(isColumnField).map((f) => toDataColumn(f, true)),
  ];
}

export const toSourceSummary = (entity: EntityMetadata): DataSourceSummary => ({
  id: entity.entityName,
  name: entity.name || entity.entityName,
  columnCount: entityColumns(entity).length,
});

// The columns in a saved order (the CDP app's grid's columnOrder), as its grid
// applies it: the named ones first in that order, then the rest as they were
function orderColumns(columns: DataColumn[], order: readonly string[]): DataColumn[] {
  if (!order.length) return columns;
  const byKey = new Map(columns.map((c) => [c.key, c]));
  const ordered = order.map((key) => byKey.get(key)).filter((c): c is DataColumn => !!c);
  const named = new Set(order);
  return [...ordered, ...columns.filter((c) => !named.has(c.key))];
}

// columnOrder: the user's column order for this entity ([] = the backend's)
export const toSourceSchema = (entity: EntityMetadata, columnOrder: readonly string[] = []): DataSourceSchema => ({
  id: entity.entityName,
  name: entity.name || entity.entityName,
  entityName: entity.entityName,
  columns: orderColumns(entityColumns(entity), columnOrder),
});

// An ENUM value as stored (and filtered on): the metadata writes it as the
// Java name ("Construction_Permit", "open"), records hold it in capitals
// ("CONSTRUCTION_PERMIT", "OPEN"), as the CDP app's enums are
export const storedEnumValue = (metadataValue: string) => metadataValue.toUpperCase();

// An ENUM value as people read it ("Construction Permit")
export const enumLabel = (metadataValue: string) =>
  metadataValue
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

// How each column is filtered, decided from its field as the CDP app does
// (fieldManifest toFilterSpec): an ENUM field's values to tick, Yes / No for a
// yes / no field (its checkbox), a range for numbers and dates, typed words
// for text
export function toSourceFacets(entity: EntityMetadata): SourceFacets {
  const facets: SourceFacets = {};
  for (const field of [...(entity.baseFields ?? []), ...(entity.userDefinedFields ?? [])]) {
    if (!isFilterField(field)) continue;
    const type = toColumnType(field.dataType);
    let facet: ColumnFacet;
    if (BOOLEAN_TYPES.has(field.dataType.toLowerCase())) facet = { kind: "boolean" };
    else if (field.enumValues?.length) {
      facet = {
        kind: "values",
        values: field.enumValues.map((value) => ({ value: storedEnumValue(value), label: enumLabel(value) })),
      };
    }
    else if (type === "text") facet = { kind: "text" };
    else facet = { kind: "range", min: null, max: null };
    facets[field.fieldName] = facet;
  }
  return facets;
}

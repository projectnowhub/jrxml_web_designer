// The CDP entities a report can show as project-data tables (plain call; the
// cache is TanStack Query's, queries/dataSources.ts):
//   GET {VITE_API_BASE_URL}/v2/entities  -> EntityMetadata[] (types/entityMetadata.ts)
// One call gives every table and its columns, the same for every project (the
// CDP app needs four calls for this; this endpoint was made for the designer).
// A table is an entity (its id = entityName, so charts ask the analytics
// endpoint for it), its columns the entity's base and user-defined fields.

import apiClient, { unwrap } from "./apiClient";
import { API_ROUTES } from "@/config/apiConfig";
import type { EntityFieldMetadata, EntityMetadata } from "@/types/entityMetadata";
import type { ColumnFacet, DataColumn, DataColumnType, DataSourceSchema, DataSourceSummary, SourceFacets } from "@/types/dataSource";

async function list(signal?: AbortSignal): Promise<EntityMetadata[]> {
  const entities = unwrap<EntityMetadata[]>(await apiClient.get<unknown>(API_ROUTES.entities, { signal }));
  if (!Array.isArray(entities)) throw new Error("The entity list is not a list");
  return entities.filter((e) => e?.entityName);
}

export const entityApi = { list };

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
function columnType(dataType: string): DataColumnType {
  const type = dataType.toLowerCase();
  if (NUMBER_TYPES.has(type)) return "number";
  if (DATE_TYPES.has(type)) return "date";
  return "text";
}

// A field a table column can show: one value per row (links to other records
// and lists of them are left out for now)
const isColumnField = (field: EntityFieldMetadata) =>
  !field.collection && field.dataType.toUpperCase() !== "ENTITY";

const toColumn = (field: EntityFieldMetadata, userDefined: boolean): DataColumn => ({
  key: field.fieldName,
  label: field.name || field.fieldName,
  type: columnType(field.dataType),
  ...(userDefined ? { userDefined } : {}),
});

// Base fields first, then the tenant's own (user-defined) ones, each in the backend's order
function columnsOf(entity: EntityMetadata): DataColumn[] {
  return [
    ...(entity.baseFields ?? []).filter(isColumnField).map((f) => toColumn(f, false)),
    ...(entity.userDefinedFields ?? []).filter(isColumnField).map((f) => toColumn(f, true)),
  ];
}

export const toSourceSummary = (entity: EntityMetadata): DataSourceSummary => ({
  id: entity.entityName,
  name: entity.name || entity.entityName,
  columnCount: columnsOf(entity).length,
});

export const toSourceSchema = (entity: EntityMetadata): DataSourceSchema => ({
  id: entity.entityName,
  name: entity.name || entity.entityName,
  entityName: entity.entityName,
  columns: columnsOf(entity),
});

const BOOLEAN_TYPES = new Set(["boolean", "bool"]);

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
    if (!isColumnField(field)) continue;
    const type = columnType(field.dataType);
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

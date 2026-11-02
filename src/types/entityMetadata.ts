// What GET /v2/entities answers (the backend's EntityMetadataDto and
// FieldMetadataDto): every CDP entity a report can list, with its fields.
// The same for every project; a project's rows are that entity's records.

export interface EntityFieldMetadata {
  // The property path (user-defined fields: "+<tenant>_<id>")
  fieldName: string;
  // What people call it ("Contract Name")
  name: string;
  mandatory: boolean;
  // Java / Jmix type of a base field (String, Double, Integer, LocalDate,
  // Boolean, ENUM, ENTITY…) or of a user-defined one (STRING, INTEGER,
  // DECIMAL, BOOLEAN, DATE_WITHOUT_TIME, ENUMERATION…)
  dataType: string;
  readOnly: boolean;
  description: string | null;
  // ENTITY fields: the entity it links to
  referenceEntity: string | null;
  cardinality: "NONE" | "MANY_TO_ONE" | "ONE_TO_ONE" | "ONE_TO_MANY" | "MANY_TO_MANY" | string;
  enumValues: string[];
  collection: boolean;
}

export interface EntityMetadata {
  entityName: string;
  name: string;
  baseFields: EntityFieldMetadata[];
  userDefinedFields: EntityFieldMetadata[];
}

// Jmix Reports enums, with the ids the report structure stores (read from the
// jmix-reports 3.0.1 entity classes). Const objects instead of enums: this
// project compiles with erasableSyntaxOnly.

// DataSet.type
export const JmixDataSetType = {
  SQL: 10,
  JPQL: 20,
  GROOVY: 30,
  SINGLE: 40,
  MULTI: 50,
  JSON: 60,
  DELEGATE: 70,
} as const;

export type JmixDataSetType = (typeof JmixDataSetType)[keyof typeof JmixDataSetType];

// BandDefinition.orientation
export const JmixBandOrientation = {
  HORIZONTAL: 0,
  VERTICAL: 1,
  CROSS: 2,
} as const;

export type JmixBandOrientation = (typeof JmixBandOrientation)[keyof typeof JmixBandOrientation];

// ReportInputParameter.type
export const JmixParameterType = {
  DATE: 10,
  TEXT: 20,
  ENTITY: 30,
  BOOLEAN: 40,
  NUMERIC: 50,
  ENTITY_LIST: 60,
  ENUMERATION: 70,
  DATETIME: 80,
  TIME: 90,
} as const;

export type JmixParameterType = (typeof JmixParameterType)[keyof typeof JmixParameterType];

// ReportTemplate.reportOutputType
export const JmixOutputType = {
  XLS: 0,
  DOC: 10,
  PDF: 20,
  HTML: 30,
  DOCX: 40,
  XLSX: 50,
  CUSTOM: 60,
  CHART: 70,
  CSV: 80,
  TABLE: 90,
  PIVOT_TABLE: 100,
} as const;

export type JmixOutputType = (typeof JmixOutputType)[keyof typeof JmixOutputType];

// ReportTemplate.customDefinedBy
export const JmixCustomDefinedBy = {
  CLASS: 100,
  SCRIPT: 200,
  URL: 300,
  DELEGATE: 400,
} as const;

export type JmixCustomDefinedBy = (typeof JmixCustomDefinedBy)[keyof typeof JmixCustomDefinedBy];

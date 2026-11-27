// Jmix types: the filter, sort and list request / answer of the CDP backend's
// entity lists (GET /v2/table/{entityName}), as cdp-fe-app's
// createJmixCrudService uses them.

export type JmixOperator =
  | "="
  | "!="
  | ">"
  | "<"
  | ">="
  | "<="
  | "<>"
  | "in"
  | "notIn"
  | "contains"
  | "startsWith"
  | "endsWith";

export interface JmixCondition {
  property: string;
  operator: JmixOperator;
  value: unknown;
}

export interface JmixFilter {
  group?: "AND" | "OR";
  conditions: (JmixCondition | JmixFilter)[];
}

export interface JmixSort {
  id: string;
  desc: boolean;
}

export interface JmixListParams {
  limit?: number;
  offset?: number;
  filter?: JmixFilter;
  sort?: JmixSort[];
  fetchPlan?: string;
  dynamicAttributes?: boolean;
}

export interface JmixListResponse<TRow> {
  rows: TRow[];
  total: number;
  hasMore: boolean;
}

// A plain value in a Jmix record
export type JmixScalar = string | number | boolean | null;

// A value in a Jmix record: plain, a linked record, or a list of them
export type JmixValue = JmixScalar | JmixReference | JmixValue[];

// A linked record inside a row: named by _instanceName (or its name / title)
export interface JmixReference {
  id?: string;
  _instanceName?: string;
  name?: string;
  title?: string;
  [field: string]: JmixValue | undefined;
}

// One row of an entity list, field by field (a table's rows)
export type JmixRecord = Record<string, JmixValue | undefined>;

// An entity's own fields (dynamic attributes, asked for with
// dynamicAttributes=true): "+<tenant>_<id>" keys, plain values
export type JmixDynamicAttributes = { [attribute: `+${string}`]: JmixScalar | undefined };

// The same fields with their names (dynamicAttr in a row read with
// dynamicAttributes=true): the field's name, its "+<tenant>_<id>" code, its value
export interface JmixDynamicAttributeEntry {
  name?: string;
  code?: string;
  value?: JmixScalar;
}

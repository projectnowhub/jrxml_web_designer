// Report bands: where a template's data comes from, as the designer will send
// it to the report server with the JRXML (utils/reportBands.ts). The server
// stores each template as a Jmix report and turns every band below into a
// Jmix band with one Groovy data set calling its band loader (the stored
// structure: types/jmixReport.ts), so it loads the data itself when the
// report runs. No query text is sent: the server checks entities, properties
// and operators, and adds the project condition itself.
// Every band names what it fills in the JRXML (`fills`): String parameters (a
// linked project detail), a table's <subDataset>, an <image> (a chart, a map).
// Text in `{{…}}` is filled in for each run from the report's parameters:
// {{projectId}} (`project`) and the moving date ranges ({{thisMonth.from}},
// {{thisMonth.to}}, lastMonth, thisQuarter, thisYear, last30Days), worked out
// from `reportDate`.

import type { AggregateRequest, ChartBinding } from "./dataSource";
import type { JmixFilter } from "./jmix";

export type BandKind = "projectValues" | "entityRows" | "projectList" | "aggregate" | "map";

// A run parameter of the report (a Jmix input parameter, matched by `alias`)
export interface BandParameterSpec {
  alias: string;
  name: string;
  type: "ENTITY" | "DATE";
  // type ENTITY: the entity whose id is passed
  entity?: string;
  required: boolean;
  defaultValue?: string;
  // type DATE: today when the run doesn't say
  defaultIsToday?: boolean;
}

// How a value is written: as text (none), a stored value's words, a date, HTML
// as plain text (a line per paragraph), an amount
export type BandValueFormat = "label" | "date" | "html" | "amount";

// One value read from the project record (or a list item)
export interface BandValueSource {
  // A property path ("projectManager.name"; "businessTypes[].name" joins a list)
  path?: string;
  // Several properties joined by `separator` (empty ones skipped)
  paths?: string[];
  separator?: string;
  format?: BandValueFormat;
  // format "label": stored value → words
  labels?: Record<string, string>;
  // format "date": a Java DateTimeFormatter pattern, English month names
  pattern?: string;
  // format "amount": digits after the point
  decimals?: number;
}

// A field of a band's rows: its name is the JRXML parameter or dataset field it fills
export interface BandField extends BandValueSource {
  name: string;
  // A user-defined field: the `value` of the project's dynamicAttr with this code
  dynamicAttribute?: string;
  label?: string;
  // A column holding another record: its _instanceName
  linked?: boolean;
}

export interface BandSort {
  property: string;
  desc: boolean;
}

// What a band fills in the JRXML
export interface BandFills {
  parameters?: string[];
  subDataset?: string;
  // An <image>'s uuid and size (a chart, a map's picture)
  image?: string;
  width?: number;
  height?: number;
  zoom?: number;
  // A map's address text field (its whole expression becomes the address)
  addressText?: string | null;
}

interface BandSpecBase {
  // The Jmix band's name: unique, Latin letters, digits and _ only
  name: string;
  kind: BandKind;
  // For people reading the structure (the tab, the Jmix Reports screen)
  label: string;
  fills: BandFills;
}

// The linked project details: one row, its fields the JRXML's cdp_* parameters
export interface ProjectValuesBand extends BandSpecBase {
  kind: "projectValues";
  source: { entity: string; id: string; fetchPlan: string; dynamicAttributes: boolean };
  fields: BandField[];
}

// A data table: its rows from the entity's records in the project (as GET /v2/table/{entity})
export interface EntityRowsBand extends BandSpecBase {
  kind: "entityRows";
  // projectProperty: the record's path to its project (project.id or contract.project.id)
  source: { entity: string; projectProperty: string; fetchPlan?: string; dynamicAttributes: boolean };
  fields: BandField[];
  // The table's own filters (the server adds the project condition)
  filter: JmixFilter;
  sort: BandSort[];
  maxRows: number;
}

// A project list (manager, team, companies, contracts): one row per item of
// `list` on the project; `single`: `list` holds one record (the project manager)
export interface ProjectListBand extends BandSpecBase {
  kind: "projectList";
  list: string;
  single?: boolean;
  fields: BandField[];
}

// A chart: one row holding the answers of its requests (POST
// /v2/analytics/aggregate, in order), drawn with the report engine's chartSvg
export interface AggregateBand extends BandSpecBase {
  kind: "aggregate";
  source: { entity: string; projectProperty: string };
  // Without the project condition (globalFilter): the server adds it
  requests: AggregateRequest[];
  chart: ChartBinding;
}

// A Location following the project: its map picture drawn for the project's
// coordinates, its address written from these lines
export interface MapBand extends BandSpecBase {
  kind: "map";
  latitudePath: string;
  longitudePath: string;
  // Each line: its paths' non-empty values joined by its separator; empty lines dropped
  addressLines: { paths: string[]; separator?: string }[];
  lineSeparator: string;
}

export type BandSpec = ProjectValuesBand | EntityRowsBand | ProjectListBand | AggregateBand | MapBand;

// The `bands` of a template save: its run parameters and its bands, in order
export interface ReportBandsPayload {
  parameters: BandParameterSpec[];
  bands: BandSpec[];
}

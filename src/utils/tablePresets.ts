// Table presets: typed tables (custom tables) laid out like the tables of a
// monthly project report, with placeholder text to type over. Each is an
// ordinary custom table in the Corporate Blue style, so everything in it can be
// changed afterwards (rows, columns, merges, style, cell colours).

import type { CustomTableCell, CustomTableElement, CustomTableRow } from "@/types";
import { mergeCells, MIN_COLUMN_WIDTH, scaleSizes, syncTableSize } from "./customTable";
import type { FrameTemplateContext } from "./framePresets";

// The traffic-light dot of a status cell: a coloured "●" (its text colour is the status)
export const STATUS_DOT = "●";
const STATUS = { low: "#92D050", moderate: "#FFC000", high: "#FF0000" } as const;
const SUBTOTAL_FILL = "#DCE6F1";

export const TABLE_PRESET_TYPES = [
  "tableKeyValue",
  "tableFinancial",
  "tableProgress",
  "tableComparison",
  "tableActionPlan",
  "tableRiskRegister",
] as const;

export type TablePresetType = (typeof TABLE_PRESET_TYPES)[number];

export function isTablePresetType(type: string): type is TablePresetType {
  return (TABLE_PRESET_TYPES as readonly string[]).includes(type);
}

type Cell = string | CustomTableCell;
const cell = (c: Cell): CustomTableCell => (typeof c === "string" ? { text: c } : { ...c });
const row = (height: number, cells: Cell[]): CustomTableRow => ({ height, cells: cells.map(cell) });

// Bullet points in a cell (formatted text)
const bullets = (items: string[]): CustomTableCell => ({
  text: `<ul>${items.map((i) => `<li>${i.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</li>`).join("")}</ul>`,
  rich: true,
});

function table(
  ctx: FrameTemplateContext,
  shares: number[],
  rows: CustomTableRow[],
  options: { headerRows?: number; totalRow?: boolean } = {},
): CustomTableElement {
  const element: CustomTableElement = {
    type: "customTable",
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    table: {
      columns: scaleSizes(shares, Math.round(ctx.availableWidth), MIN_COLUMN_WIDTH),
      rows,
      theme: "corporateBlue",
      headerRows: options.headerRows ?? 1,
      totalRow: options.totalRow ?? false,
      padding: 3,
    },
  };
  syncTableSize(element);
  return element;
}

const label = (ctx: FrameTemplateContext, key: string) => ctx.t(`reportParts.tables.${key}`);
const numbered = (ctx: FrameTemplateContext, key: string, n: number) => ctx.t(`reportParts.tables.${key}`, { n });

// KEY STATISTICS: a heading across, then a bold label and its value per row
function keyValue(ctx: FrameTemplateContext): CustomTableElement {
  const l = (key: string) => label(ctx, key);
  const bold = (key: string): CustomTableCell => ({ text: l(key), bold: true });
  const el = table(ctx, [32, 68], [
    row(20, [{ text: l("keyValueTitle"), align: "Center" }, ""]),
    row(18, [bold("projectName"), ""]),
    row(18, [bold("client"), ""]),
    row(18, [bold("location"), ""]),
    row(18, [bold("contractSum"), ""]),
    row(18, [bold("completionDate"), ""]),
  ]);
  mergeCells(el.table, { top: 0, bottom: 0, left: 0, right: 1 });
  return el;
}

// DESCRIPTION / AMOUNT, a shaded subtotal row and a total row
function financial(ctx: FrameTemplateContext): CustomTableElement {
  const l = (key: string) => label(ctx, key);
  const amount = (bold = false): CustomTableCell => ({ text: "0", align: "Right", ...(bold ? { bold: true } : {}) });
  return table(
    ctx,
    [72, 28],
    [
      row(20, [{ text: l("description"), align: "Center" }, { text: l("amount"), align: "Center" }]),
      row(18, [{ text: l("contractSum"), bold: true }, amount(true)]),
      row(18, [l("approvedChanges"), amount()]),
      row(18, [l("pendingChanges"), amount()]),
      row(18, [
        { text: l("subtotal"), bold: true, fill: SUBTOTAL_FILL },
        { ...amount(true), fill: SUBTOTAL_FILL },
      ]),
      row(18, [l("totalCost"), amount(true)]),
    ],
    { totalRow: true },
  );
}

// Item / Description / Target % / Actual % / Variance %, with an Overall row
function progress(ctx: FrameTemplateContext): CustomTableElement {
  const l = (key: string) => label(ctx, key);
  const n = (value = "0.00"): CustomTableCell => ({ text: value, align: "Center" });
  const header = ["item", "description", "target", "actual", "variance"].map((k) => ({ text: l(k), align: "Center" as const }));
  const el = table(
    ctx,
    [8, 44, 16, 16, 16],
    [
      row(20, header),
      ...[1, 2, 3].map((i) => row(18, [n(String(i)), numbered(ctx, "activityN", i), n(), n(), n()])),
      row(18, [{ text: l("overall"), align: "Center" }, "", n(), n(), n()]),
    ],
    { totalRow: true },
  );
  mergeCells(el.table, { top: 4, bottom: 4, left: 0, right: 1 });
  return el;
}

// Two heading rows: CURRENT / PREVIOUS / DIFFERENCE, each split in two
function comparison(ctx: FrameTemplateContext): CustomTableElement {
  const l = (key: string) => label(ctx, key);
  const c = (text: string): CustomTableCell => ({ text, align: "Center" });
  const pair = [c(l("issued")), c(l("pending"))];
  const el = table(
    ctx,
    [22, 13, 13, 13, 13, 13, 13],
    [
      row(18, [c(l("category")), c(l("current")), "", c(l("previous")), "", c(l("difference")), ""]),
      row(18, ["", ...pair, ...pair, ...pair]),
      ...[1, 2, 3].map((i) => row(18, [numbered(ctx, "categoryN", i), c("0"), c("0"), c("0"), c("0"), c("0"), c("0")])),
      row(18, [l("total"), c("0"), c("0"), c("0"), c("0"), c("0"), c("0")]),
    ],
    { headerRows: 2, totalRow: true },
  );
  mergeCells(el.table, { top: 0, bottom: 1, left: 0, right: 0 });
  for (const left of [1, 3, 5]) mergeCells(el.table, { top: 0, bottom: 0, left, right: left + 1 });
  return el;
}

// ITEM / DESCRIPTION / ACTION TAKEN (bullet points) / STATUS (a coloured dot)
function actionPlan(ctx: FrameTemplateContext): CustomTableElement {
  const l = (key: string) => label(ctx, key);
  const dot = (color: string): CustomTableCell => ({
    text: STATUS_DOT,
    color,
    fontSize: 22,
    align: "Center",
    vAlign: "Middle",
  });
  const concern = (i: number, color: string) =>
    row(56, [
      numbered(ctx, "concernN", i),
      l("concernDescription"),
      bullets([l("firstAction"), l("secondAction")]),
      dot(color),
    ]);
  return table(ctx, [17, 27, 44, 12], [
    row(20, ["item", "description", "actionTaken", "status"].map((k) => ({ text: l(k), align: "Center" as const }))),
    concern(1, STATUS.low),
    concern(2, STATUS.moderate),
  ]);
}

// No / Key issue / Action taken / Next action / Due date / Risk (a coloured cell)
function riskRegister(ctx: FrameTemplateContext): CustomTableElement {
  const l = (key: string) => label(ctx, key);
  const risk = (text: string, fill: string): CustomTableCell => ({
    text,
    fill,
    color: fill === STATUS.high ? "#FFFFFF" : "#000000",
    bold: true,
    align: "Center",
    vAlign: "Middle",
  });
  const issue = (i: number, level: string, fill: string) =>
    row(56, [
      { text: String(i), align: "Center" },
      numbered(ctx, "issueN", i),
      bullets([l("firstAction"), l("secondAction")]),
      l("nextStep"),
      { text: l("dueDate"), align: "Center" },
      risk(level, fill),
    ]);
  return table(ctx, [6, 16, 28, 26, 12, 12], [
    row(24, ["no", "keyIssues", "actionTaken", "nextAction", "dueDateTitle", "risk"].map((k) => ({ text: l(k), align: "Center" as const, vAlign: "Middle" as const }))),
    issue(1, l("high"), STATUS.high),
    issue(2, l("moderate"), STATUS.moderate),
  ]);
}

const BUILDERS: Record<TablePresetType, (ctx: FrameTemplateContext) => CustomTableElement> = {
  tableKeyValue: keyValue,
  tableFinancial: financial,
  tableProgress: progress,
  tableComparison: comparison,
  tableActionPlan: actionPlan,
  tableRiskRegister: riskRegister,
};

export function buildTablePreset(type: TablePresetType, ctx: FrameTemplateContext): CustomTableElement {
  return BUILDERS[type](ctx);
}

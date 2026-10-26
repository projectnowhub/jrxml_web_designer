// "Reset style": an element loses its styling and keeps its content, position
// and size. A box keeps its parts (each part resets on its own); a table gets
// the "None" style: no colours, only its lines.

import type { DesignElement } from "@/types";
import { BOX_CORNER_RADIUS_PROPERTY, FRAME_COLORS, pen, ROUNDED_BORDER_PENS_PROPERTY, ROUNDED_BORDER_PROPERTY } from "./framePresets";
import { IMAGE_CORNER_RADIUS_PROPERTY, IMAGE_SHAPE_PROPERTY, TEXT_CORNER_RADIUS_PROPERTY } from "./elementUtils";
import { isPagination } from "./paginationPresets";
import { DEFAULT_CHART_PALETTE } from "./chart/chartTypes";
import { resetContentsListStyle } from "./contentsList";

// Properties that only hold styling
const STYLE_PROPERTIES = new Set([
  IMAGE_SHAPE_PROPERTY,
  IMAGE_CORNER_RADIUS_PROPERTY,
  TEXT_CORNER_RADIUS_PROPERTY,
  BOX_CORNER_RADIUS_PROPERTY,
  ROUNDED_BORDER_PROPERTY,
  ROUNDED_BORDER_PENS_PROPERTY,
]);

function dropStyleProperties(element: { properties?: { name?: string }[] }) {
  if (!Array.isArray(element.properties)) return;
  element.properties = element.properties.filter((p) => !STYLE_PROPERTIES.has(p?.name ?? ""));
  if (element.properties.length === 0) delete element.properties;
}

export interface ResetOptions {
  // The report's default text size
  fontSize?: number;
  // A frame in the Background band: keeps a plain border (it is drawn for nothing else)
  isPageBorder?: boolean;
}

// Changes the element in place; the caller records the undo step
export function resetElementStyle(element: DesignElement, options: ResetOptions = {}): void {
  const el = element as any;
  dropStyleProperties(el);
  delete el.forecolor;
  delete el.forecolorMode;
  delete el.backcolor;
  delete el.box;
  delete el.border;
  el.mode = "Transparent";

  switch (element.type) {
    case "textField": {
      if (options.fontSize) el.fontSize = options.fontSize;
      else delete el.fontSize;
      delete el.fontFamily;
      el.isBold = false;
      el.isItalic = false;
      el.isUnderline = false;
      // A page number keeps the side of the page it was put on
      if (!isPagination(element)) el.textAlignment = "Left";
      el.verticalAlignment = isPagination(element) ? "Middle" : "Top";
      el.rotation = "None";
      break;
    }
    case "image":
      el.rotation = "None";
      break;
    case "frame":
      delete el.radius;
      delete el.cornerRadii;
      el.backcolor = "#FFFFFF";
      if (options.isPageBorder) el.box = { pen: pen(1, FRAME_COLORS.navy) };
      break;
    case "line":
      el.lineWidth = 1;
      delete el.lineColor;
      delete el.lineStyle;
      delete el.pen;
      break;
    case "rectangle":
    case "ellipse":
      delete el.pen;
      delete el.radius;
      delete el.lineWidth;
      delete el.lineColor;
      delete el.lineStyle;
      break;
    case "barcode":
      el.rotation = "None";
      break;
    case "chart":
      if (el.binding) {
        el.binding.palette = DEFAULT_CHART_PALETTE;
        el.binding.showLegend = true;
      }
      break;
    case "table":
      delete el.mode;
      if (el.binding) {
        el.binding.theme = "none";
        delete el.binding.look;
        delete el.binding.customized;
        // Columns' own colours go; highlight rules stay (they are what the
        // user decided to show, not a look)
        for (const col of el.binding.columns) delete col.look;
      }
      break;
    case "contentsList":
      delete el.mode;
      resetContentsListStyle(el.list);
      el.height = Math.max(1, el.list.entries.length) * el.list.rowHeight;
      break;
    case "customTable": {
      delete el.mode;
      const table = el.table;
      table.theme = "none";
      delete table.look;
      delete table.customized;
      if (table.headerRows === 0) table.headerRows = 1;
      table.padding = 3;
      for (const row of table.rows) {
        for (const cell of row.cells) {
          for (const key of ["fill", "color", "bold", "italic", "underline", "align", "vAlign", "fontSize"]) {
            delete cell[key];
          }
        }
      }
      break;
    }
  }
}

// Every element kind the AI can make, in the order the tools are listed, and
// the JSON schemas of their create / update settings (position added here).

import type { DesignElement } from "@/types";
import {
  boxKind,
  ellipseKind,
  imageKind,
  lineKind,
  rectangleKind,
  sectionHeadingKind,
  subHeadingKind,
  textKind,
} from "./basic";
import { barcodeKind, dateKind, locationKind, pageBorderKind, pageNumberKind, presetKind, tableOfContentsKind } from "./composite";
import { chartKind, dataTableKind, typedTableKind } from "./tables";
import { PLACE_PROPS, POSITION_PROPS } from "./common";
import type { ElementKind, JsonSchema } from "./types";

export const ELEMENT_KINDS: ElementKind[] = [
  textKind,
  sectionHeadingKind,
  subHeadingKind,
  imageKind,
  lineKind,
  rectangleKind,
  ellipseKind,
  boxKind,
  typedTableKind,
  dataTableKind,
  chartKind,
  barcodeKind,
  tableOfContentsKind,
  pageNumberKind,
  dateKind,
  locationKind,
  pageBorderKind,
  presetKind,
];

// Most specific first: a section heading, a location and the page border are
// boxes, a page number, a date and a sub-heading are texts
const MATCH_ORDER: ElementKind[] = [
  sectionHeadingKind,
  locationKind,
  pageBorderKind,
  boxKind,
  subHeadingKind,
  pageNumberKind,
  dateKind,
  textKind,
  imageKind,
  lineKind,
  rectangleKind,
  ellipseKind,
  typedTableKind,
  dataTableKind,
  chartKind,
  barcodeKind,
  tableOfContentsKind,
];

export const KIND_NAMES = ELEMENT_KINDS.map((k) => k.kind);
export const BOX_CHILD_KINDS = ELEMENT_KINDS.filter((k) => k.inBox).map((k) => k.kind);

export const findKind = (kind: string): ElementKind | undefined => ELEMENT_KINDS.find((k) => k.kind === kind);

// The kind of a designer element (`bandType`: the section it is in)
export const kindOf = (element: DesignElement, bandType: string): ElementKind | undefined =>
  MATCH_ORDER.find((k) => k.matches(element, bandType));

// Settings of create_<kind>: where it goes, its size and its own settings
// (`inDesign`: an item of create_design, which may have a ref)
export function createSchema(kind: ElementKind, inDesign: boolean): JsonSchema {
  return {
    type: "object",
    properties: {
      ...(kind.fixedPlace ? {} : { ...PLACE_PROPS, ...POSITION_PROPS }),
      ...kind.properties,
      ...(inDesign
        ? { ref: { type: "string", description: "A name for this element, so later items of the same create_design call can use it as parent" } }
        : {}),
    },
    required: kind.required ?? [],
    additionalProperties: false,
  };
}

// Settings update_element takes for this kind: the same, all optional
// (children are added with create_* and parent)
export function updateSchema(kind: ElementKind): JsonSchema {
  const { children: _children, ...own } = kind.properties;
  return {
    type: "object",
    properties: {
      ...(kind.fixedPlace ? {} : { ...POSITION_PROPS, page: PLACE_PROPS.page! }),
      ...own,
    },
    additionalProperties: false,
  };
}

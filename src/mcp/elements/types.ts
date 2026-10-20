// Element schemas for the AI assistant: one per kind of element the designer
// offers (text, box, image, chart…). A schema says what the AI may set (as a
// JSON schema, sent to the model as the create_<kind> tool) and turns those
// settings into a real designer element with the same builders the Element
// Library uses, so what the AI makes is what a user would make by hand.

import type { DesignElement } from "@/types";

type JsonType = "string" | "number" | "integer" | "boolean" | "object" | "array";

// The JSON schema subset the tools use (and validate.ts checks)
export interface JsonSchema {
  type?: JsonType | JsonType[];
  description?: string;
  enum?: readonly (string | number)[];
  minimum?: number;
  maximum?: number;
  items?: JsonSchema;
  minItems?: number;
  maxItems?: number;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean | JsonSchema;
}

// What the AI sent for one element (already validated against its schema)
export type ElementSpec = Record<string, any>;

// What a schema needs from the report while it builds an element
export interface KindContext {
  // Printable page inside the margins (a cover / contents page: its own area)
  availableWidth: number;
  availableHeight: number;
  // The report's font (the only one the report server has)
  fontName: string;
  fontSize: number;
  t: (key: string, named?: Record<string, unknown>) => string;
  // Things worth telling the model about what was done ("height raised to 15")
  notes: string[];
}

// A setting the AI got wrong: the message goes back to the model to fix it
export class SpecError extends Error {}

export interface ElementKind {
  // Name the AI uses ("text", "box"…); create tool: create_<kind in snake case>
  kind: string;
  tool: string;
  // Tool description: what it is and when to use it
  description: string;
  // Its own settings (position and size are added by the registry)
  properties: Record<string, JsonSchema>;
  required?: string[];
  // Placed by its own rule (the page border) instead of x / y / band / page
  fixedPlace?: boolean;
  // May be a child of a box
  inBox: boolean;
  // Band it goes to when none is given
  defaultBand?: (spec: ElementSpec) => string | undefined;
  // Created only, never read back as this kind (presets become boxes / tables)
  createOnly?: boolean;
  // Whether a designer element is of this kind (most specific kinds are asked
  // first); `bandType`: the section it is in
  matches: (element: DesignElement, bandType: string) => boolean;
  // A new element with the settings applied (uuid set, size set)
  create: (spec: ElementSpec, ctx: KindContext) => DesignElement | Promise<DesignElement>;
  // Its place when the AI gave no x / y (`area`: the band / page area or box it goes in)
  autoPlace?: (element: DesignElement, spec: ElementSpec, area: { width: number; height: number }) => void;
  // Settings changed on an existing element (only the given keys)
  update: (element: DesignElement, spec: ElementSpec, ctx: KindContext) => void | Promise<void>;
  // The element's settings in the same words, for the model to read
  describe: (element: DesignElement) => Record<string, unknown>;
}

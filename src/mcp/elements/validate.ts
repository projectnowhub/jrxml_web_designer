// Checks tool arguments against the JSON schema subset the tools use, so the
// model gets a precise message ("children[2].fontSize: must be at least 4")
// instead of a half-made element.

import type { JsonSchema } from "./types";

const typeOf = (value: unknown): string =>
  Array.isArray(value) ? "array" : value === null ? "null" : typeof value;

export function validateValue(value: unknown, schema: JsonSchema, path = ""): string[] {
  const at = path || "value";
  const errors: string[] = [];
  if (value === undefined) return errors;
  // One of several types ("a number or a date as text")
  if (Array.isArray(schema.type)) {
    const options = schema.type.map((type) => validateValue(value, { ...schema, type }, path));
    return options.find((e) => !e.length) ?? [`${at}: must be a ${schema.type.join(" or a ")}`];
  }

  switch (schema.type) {
    case "integer":
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) return [`${at}: must be a number`];
      if (schema.type === "integer" && !Number.isInteger(value)) return [`${at}: must be a whole number`];
      if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${at}: must be at least ${schema.minimum}`);
      if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${at}: must be at most ${schema.maximum}`);
      break;
    case "string":
    case "boolean":
      if (typeof value !== schema.type) return [`${at}: must be a ${schema.type}`];
      break;
    case "array": {
      if (!Array.isArray(value)) return [`${at}: must be an array`];
      if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${at}: needs at least ${schema.minItems} item(s)`);
      if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${at}: takes at most ${schema.maxItems} item(s)`);
      if (schema.items) value.forEach((item, i) => errors.push(...validateValue(item, schema.items!, `${path}[${i}]`)));
      break;
    }
    case "object": {
      if (typeOf(value) !== "object") return [`${at}: must be an object`];
      errors.push(...validateObject(value as Record<string, unknown>, schema, path));
      break;
    }
  }
  if (schema.enum && !schema.enum.includes(value as string | number)) {
    errors.push(`${at}: must be one of ${schema.enum.map((v) => JSON.stringify(v)).join(", ")}`);
  }
  return errors;
}

function validateObject(value: Record<string, unknown>, schema: JsonSchema, path: string): string[] {
  const errors: string[] = [];
  const props = schema.properties ?? {};
  const prefix = path ? `${path}.` : "";
  for (const key of schema.required ?? []) {
    if (value[key] === undefined) errors.push(`${prefix}${key}: is required`);
  }
  for (const [key, v] of Object.entries(value)) {
    const own = props[key];
    if (own) {
      errors.push(...validateValue(v, own, `${prefix}${key}`));
    } else if (schema.additionalProperties === false) {
      errors.push(`${prefix}${key}: unknown setting (allowed: ${Object.keys(props).join(", ")})`);
    } else if (typeof schema.additionalProperties === "object") {
      errors.push(...validateValue(v, schema.additionalProperties, `${prefix}${key}`));
    }
  }
  return errors;
}

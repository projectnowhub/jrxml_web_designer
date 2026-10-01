import { describe, it, expect } from "vitest";
import { hasLineBreaks, isStaticTextExpression, planTextFit } from "./textFit";

describe("isStaticTextExpression", () => {
  it("accepts a single string literal", () => {
    expect(isStaticTextExpression('"LABEL"')).toBe(true);
    expect(isStaticTextExpression('"Say \\"hi\\""')).toBe(true);
    expect(isStaticTextExpression('"<b>Bold</b> text"')).toBe(true);
  });

  it("rejects fields, parameters, variables and concatenations", () => {
    expect(isStaticTextExpression("$F{amount}")).toBe(false);
    expect(isStaticTextExpression('"Total: " + $V{total}')).toBe(false);
    expect(isStaticTextExpression('"a" + "b"')).toBe(false);
    expect(isStaticTextExpression("")).toBe(false);
  });
});

describe("hasLineBreaks", () => {
  it("finds Enter and paragraph breaks", () => {
    expect(hasLineBreaks('"one\\ntwo"')).toBe(true);
    expect(hasLineBreaks('"one<br>two"')).toBe(true);
    expect(hasLineBreaks('"<p>one</p><p>two</p>"')).toBe(true);
    expect(hasLineBreaks('"one line"')).toBe(false);
  });
});

describe("planTextFit", () => {
  const label = { x: 100, width: 50, expression: '"Revenue"' };

  it("sizes left-aligned static text to its text, keeping the left edge", () => {
    expect(planTextFit({ ...label, textAlignment: "Left" }, 80, 555)).toEqual({ x: 100, width: 80 });
    expect(planTextFit({ ...label, textAlignment: "Left" }, 30, 555)).toEqual({ x: 100, width: 30 });
  });

  it("keeps the right edge of right-aligned text", () => {
    expect(planTextFit({ ...label, textAlignment: "Right" }, 80, 555)).toEqual({ x: 70, width: 80 });
  });

  it("keeps the centre of centred text", () => {
    expect(planTextFit({ ...label, textAlignment: "Center" }, 80, 555)).toEqual({ x: 85, width: 80 });
  });

  it("stops at the container edge (the text then wraps)", () => {
    // Left-aligned at x=100 in a 300-wide box: at most 200
    expect(planTextFit({ ...label, textAlignment: "Left" }, 400, 300)).toEqual({ x: 100, width: 200 });
    // Right-aligned with right edge 150: at most 150
    expect(planTextFit({ ...label, textAlignment: "Right" }, 400, 300)).toEqual({ x: 0, width: 150 });
    // Centred at 125 in a 300-wide box: at most 250
    expect(planTextFit({ ...label, textAlignment: "Center" }, 400, 300)).toEqual({ x: 0, width: 250 });
  });

  it("keeps the width of data fields, multi-line and sideways text", () => {
    const keep = { x: 100, width: 50 };
    expect(planTextFit({ ...keep, expression: "$F{amount}" }, 200, 555)).toEqual(keep);
    expect(planTextFit({ ...keep, expression: '"a\\nb"' }, 200, 555)).toEqual(keep);
    expect(planTextFit({ ...label, rotation: "Left" }, 200, 555)).toEqual(keep);
  });
});

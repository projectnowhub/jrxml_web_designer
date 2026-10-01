import { describe, it, expect } from "vitest";
import { planBandFit } from "./bandFit";

describe("planBandFit", () => {
  it("keeps an element that fits where it was dropped", () => {
    expect(planBandFit({ y: 10, height: 20 }, 50, 80)).toEqual({ kind: "fits", y: 10 });
  });

  it("moves an element up when only its bottom sticks out", () => {
    expect(planBandFit({ y: 40, height: 20 }, 50, 80)).toEqual({ kind: "fits", y: 30 });
  });

  it("treats a negative drop position as the band's top", () => {
    expect(planBandFit({ y: -5, height: 20 }, 50, 80)).toEqual({ kind: "fits", y: 0 });
  });

  it("grows the band just enough, keeping the drop position", () => {
    expect(planBandFit({ y: 5, height: 60 }, 50, 80)).toEqual({
      kind: "grow",
      y: 5,
      bandHeight: 65,
    });
  });

  it("grows the band to its maximum and moves the element up to fit", () => {
    expect(planBandFit({ y: 30, height: 70 }, 50, 80)).toEqual({
      kind: "grow",
      y: 10,
      bandHeight: 80,
    });
  });

  it("refuses an element taller than the band's maximum", () => {
    expect(planBandFit({ y: 0, height: 120 }, 50, 80)).toEqual({
      kind: "tooTall",
      maxHeight: 80,
    });
  });

  it("never treats the maximum as smaller than the band already is", () => {
    // A band already taller than its setting (e.g. an imported report)
    expect(planBandFit({ y: 0, height: 90 }, 100, 80)).toEqual({ kind: "fits", y: 0 });
  });
});

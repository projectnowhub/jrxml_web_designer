import { describe, it, expect } from "vitest";
import {
  collectSnapTargets,
  nextGridLine,
  snapEdge,
  snapMove,
  snapToGrid,
} from "./snapping";

const targets = collectSnapTargets({ width: 555, height: 200 }, [
  { x: 100, y: 40, width: 120, height: 30 },
]);

describe("snapMove", () => {
  it("snaps to the nearest grid line when nothing is close to align to", () => {
    const r = snapMove({ x: 314, y: 126, width: 50, height: 20 }, targets, {
      grid: 10,
      threshold: 4,
    });
    expect(r).toMatchObject({ x: 310, y: 130 });
    expect(r.guides).toEqual({ x: [], y: [] });
  });

  it("prefers aligning with an element over the grid", () => {
    // Left edge 3 away from the other element's left edge (100)
    const r = snapMove({ x: 103, y: 127, width: 50, height: 20 }, targets, {
      grid: 10,
      threshold: 4,
    });
    expect(r.x).toBe(100);
    expect(r.guides.x).toContain(100);
  });

  it("aligns centres and right edges too", () => {
    // Right edge 218 → 220 (other element's right edge)
    const right = snapMove({ x: 168, y: 0, width: 50, height: 10 }, targets, {
      grid: null,
      threshold: 4,
    });
    expect(right.x).toBe(170);
    // Middle 53 → 55 (other element's middle)
    const middle = snapMove({ x: 0, y: 48, width: 10, height: 10 }, targets, {
      grid: null,
      threshold: 4,
    });
    expect(middle.y).toBe(50);
    expect(middle.guides.y).toContain(55);
  });

  it("aligns to the container edges and centre", () => {
    const r = snapMove({ x: 250, y: 0, width: 50, height: 10 }, targets, {
      grid: null,
      threshold: 4,
    });
    // Centre 275 → 277.5 (centre of 555), rounded to whole pixels
    expect(r.x).toBe(253);
    expect(r.guides.x).toContain(277.5);
  });

  it("moves freely with both snaps off", () => {
    const r = snapMove({ x: 103.4, y: 7.6, width: 50, height: 20 }, targets, {
      grid: null,
      threshold: null,
    });
    expect(r).toMatchObject({ x: 103, y: 8, guides: { x: [], y: [] } });
  });

  it("snaps items in a box to the band grid", () => {
    // Box at x=37: item x 10 is band x 47 → 50 → item x 13
    const r = snapMove({ x: 10, y: 0, width: 5, height: 5 }, { x: [], y: [] }, {
      grid: 10,
      threshold: null,
      gridOffsetX: 37,
    });
    expect(r.x).toBe(13);
  });
});

describe("snapEdge", () => {
  it("snaps a resized edge to a target, else to the grid", () => {
    expect(snapEdge(222, targets.x, { grid: 10, threshold: 4 }, "x").value).toBe(220);
    expect(snapEdge(334, targets.x, { grid: 10, threshold: 4 }, "x").value).toBe(330);
  });
});

describe("snapToGrid / nextGridLine", () => {
  it("rounds to the nearest line", () => {
    expect(snapToGrid(14, 10)).toBe(10);
    expect(snapToGrid(15, 10)).toBe(20);
  });

  it("steps to the next line in each direction", () => {
    expect(nextGridLine(14, 10, 1)).toBe(20);
    expect(nextGridLine(20, 10, 1)).toBe(30);
    expect(nextGridLine(14, 10, -1)).toBe(10);
    expect(nextGridLine(10, 10, -1)).toBe(0);
    expect(nextGridLine(10, 10, 1, 7)).toBe(13);
  });
});

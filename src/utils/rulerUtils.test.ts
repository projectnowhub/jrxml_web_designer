import { describe, it, expect } from "vitest";
import { buildGridPath, buildRulerMarks } from "./rulerUtils";

describe("buildRulerMarks", () => {
  it("numbers the ruler from the start margin, matching element X/Y", () => {
    const { labels } = buildRulerMarks(595, 20, 20);
    expect(labels[0]).toEqual({ position: 20, value: "0" });
    expect(labels[1]).toEqual({ position: 45, value: "25" });
  });

  it("labels the printable area only", () => {
    const { labels } = buildRulerMarks(595, 20, 20);
    const last = labels[labels.length - 1]!;
    expect(Number(last.value)).toBeLessThanOrEqual(555);
    expect(labels.every((l) => l.position >= 20 && l.position <= 575)).toBe(true);
  });

  it("keeps ticks aligned to the margin, continuing into both margins", () => {
    const { ticks } = buildRulerMarks(595, 22, 20);
    expect(ticks[0]!.position).toBe(2);
    expect(ticks.some((t) => t.position === 22 && t.major)).toBe(true);
    expect(ticks.every((t) => (t.position - 22) % 5 === 0)).toBe(true);
    expect(ticks[ticks.length - 1]!.position).toBeLessThanOrEqual(595);
  });

  it("marks a major tick every 25 on both sides of the margin", () => {
    const { ticks } = buildRulerMarks(200, 50, 0);
    const major = ticks.filter((t) => t.major).map((t) => t.position);
    expect(major).toEqual([0, 25, 50, 75, 100, 125, 150, 175, 200]);
  });

  it("shifts marks by the page offset", () => {
    const { labels } = buildRulerMarks(842, 20, 20, 874);
    expect(labels[0]).toEqual({ position: 894, value: "0" });
  });

  it("treats missing margins as zero", () => {
    const { labels } = buildRulerMarks(100, undefined as unknown as number, 0);
    expect(labels[0]).toEqual({ position: 0, value: "0" });
  });
});

describe("buildGridPath", () => {
  it("draws a line every grid step from the band's top-left", () => {
    const path = buildGridPath(25, 15, 1);
    expect(path).toBe("M0.5 0V15M10.5 0V15M20.5 0V15M0 0.5H25M0 10.5H25");
  });

  it("offsets lines by half the stroke so each covers its grid step", () => {
    expect(buildGridPath(10, 10, 0.5)).toBe("M0.25 0V10M0 0.25H10");
  });
});

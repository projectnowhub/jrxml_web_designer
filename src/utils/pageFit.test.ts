import { describe, it, expect } from "vitest";
import type { Band, DesignElement } from "@/types";
import { fitContentToPage } from "./pageFit";

const el = (props: Partial<DesignElement>): DesignElement =>
  ({ type: "rectangle", x: 0, y: 0, width: 50, height: 20, ...props }) as DesignElement;

const pageBorder = () =>
  el({
    type: "frame",
    width: 555,
    height: 802,
    box: { pen: { lineWidth: 2, lineColor: "#123456" } },
    elements: [],
  } as Partial<DesignElement>);

describe("fitContentToPage", () => {
  it("resizes the page border to the new printable area, keeping its style", () => {
    const bands: Band[] = [
      { type: "background", height: 802, elements: [pageBorder()] },
      { type: "detail", height: 500, elements: [] },
    ];
    const result = fitContentToPage(bands, { width: 380, height: 555 });
    const border = bands[0]!.elements[0]!;
    expect(result.borderResized).toBe(true);
    expect(border).toMatchObject({ x: 0, y: 0, width: 380, height: 555 });
    expect((border as any).box.pen.lineColor).toBe("#123456");
    expect(bands[0]!.height).toBe(555);
  });

  it("moves elements past the new right edge inside, without deleting any", () => {
    const bands: Band[] = [
      {
        type: "detail",
        height: 300,
        elements: [el({ x: 10 }), el({ x: 400, width: 100 }), el({ x: 0, width: 600 })],
      },
    ];
    const result = fitContentToPage(bands, { width: 380, height: 555 });
    const [kept, movedIn, narrowed] = bands[0]!.elements;
    expect(result.moved).toBe(2);
    expect(kept!.x).toBe(10);
    expect(movedIn).toMatchObject({ x: 280, width: 100 });
    expect(narrowed).toMatchObject({ x: 0, width: 380 });
  });

  it("pulls elements below a shrunken band back up when they fit", () => {
    const bands: Band[] = [
      { type: "detail", height: 200, elements: [el({ y: 190, height: 30 })] },
    ];
    fitContentToPage(bands, { width: 555, height: 400 });
    expect(bands[0]!.elements[0]!.y).toBe(170);
  });

  it("only moves tables, keeping their column widths", () => {
    const bands: Band[] = [
      { type: "detail", height: 300, elements: [el({ type: "table", x: 0, width: 500 } as any)] },
    ];
    fitContentToPage(bands, { width: 380, height: 555 });
    expect(bands[0]!.elements[0]!.width).toBe(500);
  });

  it("keeps a narrowed box's items in step", () => {
    const box = el({
      type: "frame",
      x: 0,
      width: 600,
      height: 100,
      elements: [el({ x: 560, width: 30 })],
    } as Partial<DesignElement>);
    const bands: Band[] = [{ type: "title", height: 120, elements: [box] }];
    fitContentToPage(bands, { width: 400, height: 555 });
    expect((box as any).width).toBe(400);
    // The item sat by the right edge, so it moves with it
    expect((box as any).elements[0].x).toBe(360);
  });

  it("reports nothing when everything already fits", () => {
    const bands: Band[] = [
      { type: "background", height: 802, elements: [pageBorder()] },
      { type: "detail", height: 300, elements: [el({ x: 10 })] },
    ];
    expect(fitContentToPage(bands, { width: 555, height: 802 })).toEqual({
      borderResized: false,
      moved: 0,
    });
  });
});

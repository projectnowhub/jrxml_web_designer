// Paper sizes (points) and reading a page's size back as a paper and an
// orientation. Used by Template Settings (this report) and Default Settings
// (new reports).

export type Orientation = "Portrait" | "Landscape";

// Width is the short side; "Custom" is any other size
export const PAPER_SIZES = [
  { name: "Letter", width: 612, height: 792 },
  { name: "Legal", width: 612, height: 1008 },
  { name: "A0", width: 2384, height: 3370 },
  { name: "A1", width: 1684, height: 2384 },
  { name: "A2", width: 1191, height: 1684 },
  { name: "A3", width: 842, height: 1190 },
  { name: "A4", width: 595, height: 842 },
  { name: "A5", width: 420, height: 595 },
  { name: "A6", width: 298, height: 420 },
  { name: "A7", width: 210, height: 298 },
  { name: "A8", width: 147, height: 210 },
  { name: "A9", width: 105, height: 147 },
  { name: "A10", width: 74, height: 105 },
  { name: "B0", width: 2835, height: 4008 },
  { name: "B1", width: 2004, height: 2835 },
  { name: "B2", width: 1417, height: 2004 },
  { name: "B3", width: 1001, height: 1417 },
  { name: "B4", width: 708, height: 1000 },
  { name: "B5", width: 498, height: 708 },
  { name: "B6", width: 354, height: 499 },
  { name: "B7", width: 249, height: 354 },
  { name: "B8", width: 176, height: 249 },
  { name: "B9", width: 125, height: 176 },
  { name: "B10", width: 88, height: 125 },
  { name: "C0", width: 2599, height: 3676 },
  { name: "C1", width: 1837, height: 2599 },
  { name: "C2", width: 1298, height: 1837 },
  { name: "C3", width: 918, height: 1298 },
  { name: "C4", width: 649, height: 918 },
  { name: "C5", width: 459, height: 649 },
  { name: "C6", width: 323, height: 459 },
  { name: "C7", width: 230, height: 323 },
  { name: "C8", width: 162, height: 230 },
  { name: "C9", width: 113, height: 162 },
  { name: "C10", width: 79, height: 113 },
  { name: "RA0", width: 2437, height: 3458 },
  { name: "RA1", width: 1729, height: 2437 },
  { name: "RA2", width: 1218, height: 1729 },
  { name: "SRA0", width: 2551, height: 3628 },
  { name: "SRA1", width: 1814, height: 2551 },
  { name: "SRA2", width: 1275, height: 1814 },
  { name: "Executive", width: 522, height: 756 },
  { name: "Statement", width: 396, height: 612 },
  { name: "Tabloid", width: 792, height: 1224 },
  { name: "Ledger", width: 1224, height: 792 },
  { name: "Note", width: 540, height: 780 },
  { name: "Folio", width: 612, height: 936 },
  { name: "Quarto", width: 610, height: 780 },
  { name: "10x14", width: 720, height: 1008 },
  { name: "Custom", width: 0, height: 0 },
];

/** The paper and orientation a page size matches ("Custom" when none) */
export function paperOf(width: number, height: number): { paper: string; orientation: Orientation } {
  const orientation: Orientation = width > height ? "Landscape" : "Portrait";
  const short = Math.min(width, height);
  const long = Math.max(width, height);
  const match = PAPER_SIZES.find((s) => s.name !== "Custom" && s.width === short && s.height === long);
  return { paper: match ? match.name : "Custom", orientation };
}

/** A paper's page size in an orientation (null for Custom or an unknown paper) */
export function pageSizeOf(paper: string, orientation: Orientation): { width: number; height: number } | null {
  const size = PAPER_SIZES.find((s) => s.name === paper && s.name !== "Custom");
  if (!size) return null;
  return orientation === "Landscape"
    ? { width: size.height, height: size.width }
    : { width: size.width, height: size.height };
}

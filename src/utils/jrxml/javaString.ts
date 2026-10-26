// Plain text as a Java string literal in a JasperReports expression.
// JasperReports reads $F{…}, $P{…}, $P!{…}, $V{…}, $R{…} and $X{…} as references
// even inside quotes, so typed text holding one ("Total $F{x}") would stop the
// report from compiling. The "$" is split off into its own literal instead:
// "Total $" + "F{x}" is the same string in Java and holds no reference.
// The parser joins it back (joinSplitReferences), so the design keeps the text.

const REFERENCE_START = /\$(?=[FPVRX]!?\{)/g;
const SPLIT_REFERENCE = /\$" \+ "/g;

// Split every reference start inside an already escaped literal's content
export const splitReferences = (escapedContent: string): string =>
  escapedContent.replace(REFERENCE_START, () => '$" + "');

// Back to one literal when reading a report (joining two literals changes nothing)
export const joinSplitReferences = (expression: string): string =>
  expression.replace(SPLIT_REFERENCE, () => "$");

// `newLine`: what a line break becomes (\n, or a space in a single-line value)
export const javaString = (text: string, newLine = "\\n"): string =>
  `"${splitReferences(text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r\n|\r|\n/g, newLine))}"`;

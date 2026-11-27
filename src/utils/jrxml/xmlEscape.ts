// Escaping for everything the generator writes into JRXML. Any text a user
// can type (names, labels, colours, expressions, property values) goes
// through one of these, so a stray "<", "&", quote or "]]>" can't break the
// report's XML.

// An attribute value: numbers pass through, text is escaped
export const xmlAttr = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

// A CDATA section that stays valid whatever the text holds
export const cdata = (value: unknown): string =>
  `<![CDATA[${String(value ?? "").replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;

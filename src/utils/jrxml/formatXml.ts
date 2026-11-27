// Indents JRXML for reading in the editor. It only adds or removes whitespace
// between tags: tags, attribute values, CDATA sections, comments and text are
// copied exactly, so the formatted report is the same report.
// (An HTML beautifier can't be used: it rewrites "<![CDATA[" and "$V{".)

type Token =
  | { kind: "open"; text: string }
  | { kind: "close"; text: string }
  | { kind: "single"; text: string } // self-closing tag, comment, <?…?>, <!DOCTYPE>
  | { kind: "cdata"; text: string }
  | { kind: "text"; text: string };

// End of a tag starting at `from`, skipping ">" inside quoted attribute values
function tagEnd(xml: string, from: number): number {
  let quote = "";
  for (let i = from + 1; i < xml.length; i++) {
    const c = xml[i];
    if (quote) {
      if (c === quote) quote = "";
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === ">") {
      return i;
    }
  }
  return -1;
}

function tokenize(xml: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  const until = (end: string, from: number) => {
    const at = xml.indexOf(end, from);
    return at === -1 ? -1 : at + end.length;
  };
  while (i < xml.length) {
    if (xml[i] !== "<") {
      const next = xml.indexOf("<", i);
      const end = next === -1 ? xml.length : next;
      tokens.push({ kind: "text", text: xml.slice(i, end) });
      i = end;
      continue;
    }
    let end: number;
    let kind: Token["kind"];
    if (xml.startsWith("<![CDATA[", i)) {
      end = until("]]>", i);
      kind = "cdata";
    } else if (xml.startsWith("<!--", i)) {
      end = until("-->", i);
      kind = "single";
    } else if (xml.startsWith("<?", i)) {
      end = until("?>", i);
      kind = "single";
    } else {
      const close = tagEnd(xml, i);
      end = close === -1 ? -1 : close + 1;
      const tag = xml.slice(i, end);
      kind = tag.startsWith("</") ? "close" : tag.startsWith("<!") || tag.endsWith("/>") ? "single" : "open";
    }
    // Unfinished markup: leave the text as it is
    if (end === -1) return null;
    tokens.push({ kind, text: xml.slice(i, end) } as Token);
    i = end;
  }
  return tokens;
}

export function formatXml(xml: string, indent = "  "): string {
  const tokens = tokenize(xml);
  if (!tokens) return xml;

  const lines: string[] = [];
  let depth = 0;
  const pad = () => indent.repeat(Math.max(depth, 0));

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    if (token.kind === "text") {
      // Whitespace between tags is layout; other text is kept as it is
      if (token.text.trim()) lines.push(pad() + token.text.trim());
      continue;
    }
    if (token.kind === "open") {
      // An element holding only text or CDATA stays on one line, unchanged
      let j = i + 1;
      while (j < tokens.length && (tokens[j]!.kind === "text" || tokens[j]!.kind === "cdata")) j++;
      if (tokens[j]?.kind === "close") {
        lines.push(pad() + tokens.slice(i, j + 1).map((t) => t.text).join(""));
        i = j;
        continue;
      }
      lines.push(pad() + token.text);
      depth++;
      continue;
    }
    if (token.kind === "close") {
      depth--;
      lines.push(pad() + token.text);
      continue;
    }
    lines.push(pad() + token.text);
  }
  return lines.join("\n") + "\n";
}

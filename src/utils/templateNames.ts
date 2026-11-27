// New template names: "Untitled Template", then "Untitled Template 2", "3"…
// The first one no template already has (case and spaces ignored). Used for the
// templates saved in this browser (stores/files.ts) and for the codes on the
// report server, where a template's code is unique and shown as its name.

// "Untitled Template 4" → "Untitled Template"; a name without a number stays
export function templateNameBase(name: string): string {
  return name.trim().replace(/\s+\d+$/, "");
}

// The first of base, "base 2", "base 3"… that none of `used` is
export function firstFreeTemplateName(base: string, used: Iterable<string>): string {
  const taken = new Set(Array.from(used, (name) => name.trim().toLowerCase()));
  const start = base.trim();
  if (!taken.has(start.toLowerCase())) return start;
  for (let n = 2; ; n++) {
    const name = `${start} ${n}`;
    if (!taken.has(name.toLowerCase())) return name;
  }
}

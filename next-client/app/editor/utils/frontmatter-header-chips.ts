// The chips of the frontmatter header (codemirror/frontmatter-header.ts), from
// the block's text alone. A strict, synchronous line parser: it accepts only
// simple YAML (top-level scalars, scalar lists, block scalars) and returns
// null for anything else, so the raw YAML shows instead of a wrong header.
// js-yaml is lazily loaded and debounced (markdown-problems.ts), so a render
// can't wait for it.

export type HeaderChipKind = "type" | "tag" | "more-tags" | "status" | "date" | "field";

export interface HeaderChip {
  kind: HeaderChipKind;
  // YAML key ("tags" for tag chips).
  key: string;
  // Shown text ("#work", "Due Nov 15", "in-progress").
  label: string;
  // The faint key part at the start of a "field" / other-date chip label.
  keyLabel?: string;
  // Raw unquoted value ("2026-11-15").
  value: string;
  // 0-based line index of the key's line in the block text.
  line: number;
  ariaLabel: string;
}

export const ISO_DATE_VALUE = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

const KEY_LINE = /^([A-Za-z_][\w-]*)[ \t]*:(?:[ \t]+(.*))?$/;
const ITEM_LINE = /^\s*-\s+(\S.*)$/;
const TAG_LIMIT = 3;
const LABEL_LIMIT = 40;

export function shortDate(value: string, now: Date = new Date()): string | null {
  if (!ISO_DATE_VALUE.test(value)) return null;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  const short = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return year === now.getFullYear() ? short : `${short}, ${year}`;
}

interface Entry {
  key: string;
  line: number;
  text: string;
  list: string[];
  blockScalar: boolean;
}

// One scalar as written after `key:` or `- `: its unquoted text, or null
// when it's not simple. `list` is set for a flow list.
function parseScalar(raw: string): { text: string; list?: string[]; block?: boolean } | null {
  const rest = raw.trim();
  if (!rest || rest.startsWith("#")) return { text: "" };
  if (/^[{&*!]/.test(rest)) return null;
  if (rest === "|" || rest === ">") return { text: "", block: true };
  if (/^[|>]/.test(rest)) return null;
  if (rest.startsWith("[")) {
    const flow = /^\[(.*)\]\s*(?:#.*)?$/.exec(rest);
    if (!flow || /[[\]{]/.test(flow[1])) return null;
    const list: string[] = [];
    for (const part of flow[1].split(",")) {
      const item = part.trim();
      if (!item) continue;
      const parsed = parseScalar(item);
      if (!parsed || parsed.list || parsed.block) return null;
      if (parsed.text) list.push(parsed.text);
    }
    return { text: list.join(", "), list };
  }
  if (rest.startsWith('"')) {
    const quoted = /^"((?:[^"\\]|\\.)*)"\s*(?:#.*)?$/.exec(rest);
    return quoted ? { text: quoted[1].replace(/\\(["\\])/g, "$1") } : null;
  }
  if (rest.startsWith("'")) {
    const quoted = /^'((?:[^']|'')*)'\s*(?:#.*)?$/.exec(rest);
    return quoted ? { text: quoted[1].replace(/''/g, "'") } : null;
  }
  const bare = rest.replace(/\s+#.*$/, "").trim();
  if (bare.includes(": ") || bare.endsWith(":")) return null;
  return { text: bare };
}

function parseEntries(lines: string[]): Entry[] | null {
  const entries: Entry[] = [];
  const seen = new Set<string>();
  let current: Entry | null = null;
  let mode: "none" | "items" | "scalar" = "none";
  for (let i = 1; i < lines.length - 1; i++) {
    const line = lines[i].trimEnd();
    if (mode === "scalar" && (!line.trim() || /^\s/.test(line))) {
      if (current && !current.text && line.trim()) current.text = line.trim();
      continue;
    }
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const key = KEY_LINE.exec(line);
    if (key) {
      if (seen.has(key[1])) return null;
      seen.add(key[1]);
      const parsed = parseScalar(key[2] ?? "");
      if (!parsed) return null;
      current = { key: key[1], line: i, text: parsed.text, list: parsed.list ?? [], blockScalar: !!parsed.block };
      entries.push(current);
      mode = parsed.block ? "scalar" : parsed.text || parsed.list ? "none" : "items";
      continue;
    }
    const item = ITEM_LINE.exec(line);
    if (!item || !current || mode !== "items") return null;
    if (/^[A-Za-z_][\w-]*:(\s|$)/.test(item[1])) return null;
    const parsed = parseScalar(item[1]);
    if (!parsed || parsed.list || parsed.block) return null;
    if (parsed.text) current.list.push(parsed.text);
  }
  return entries;
}

const cut = (label: string) => (label.length > LABEL_LIMIT ? `${label.slice(0, LABEL_LIMIT - 1)}…` : label);

function valueOf(entry: Entry): string {
  return entry.list.length ? entry.list.join(", ") : entry.text;
}

// The header's chips for the block text (fences included), or null when the
// YAML isn't simple enough to summarize or yields no chip: show it raw then.
export function frontmatterHeaderChips(blockText: string, now: Date = new Date()): HeaderChip[] | null {
  if (blockText.includes("{{")) return null;
  const lines = blockText.split("\n");
  if (lines.length < 3) return null;
  const entries = parseEntries(lines);
  if (!entries) return null;

  const chips: HeaderChip[] = [];
  const used = new Set<Entry>();
  const make = (entry: Entry, kind: HeaderChipKind, label: string, suffix: string, keyLabel?: string, override?: string) => {
    used.add(entry);
    const full = cut(label);
    const value = override ?? valueOf(entry);
    chips.push({
      kind,
      key: entry.key,
      label: full,
      keyLabel: keyLabel && full.startsWith(keyLabel) ? keyLabel : undefined,
      value,
      line: entry.line,
      ariaLabel: `${entry.key}: ${value}, ${suffix}`,
    });
  };
  const find = (key: string) => entries.find((entry) => entry.key === key && valueOf(entry));

  const type = find("type");
  if (type) make(type, "type", valueOf(type), "edit");

  const tags = find("tags");
  if (tags) {
    const names = (tags.list.length ? tags.list : tags.text.split(",")).map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean);
    for (const name of names.slice(0, TAG_LIMIT)) make(tags, "tag", `#${name}`, "edit", undefined, name);
    if (names.length > TAG_LIMIT) make(tags, "more-tags", `+${names.length - TAG_LIMIT}`, "edit", undefined, names.join(", "));
  }

  const status = find("status");
  if (status) make(status, "status", valueOf(status), "change status");

  const dateEntries = (key: string) => entries.filter((entry) => entry.key === key && ISO_DATE_VALUE.test(entry.text));
  const dateChip = (entry: Entry, prefix: string, keyLabel?: string) => {
    const short = shortDate(entry.text, now);
    if (short) make(entry, "date", `${prefix}${short}`, "change date", keyLabel);
  };
  for (const entry of [...dateEntries("due_date"), ...dateEntries("due")]) dateChip(entry, "Due ");
  for (const entry of dateEntries("date")) dateChip(entry, "");
  const skipped = new Set(["type", "tags", "status", "title", "due_date", "due", "date"]);
  for (const entry of entries) {
    if (!skipped.has(entry.key) && ISO_DATE_VALUE.test(entry.text) && shortDate(entry.text, now)) dateChip(entry, `${entry.key} `, entry.key);
  }

  for (const entry of entries) {
    const value = valueOf(entry);
    if (used.has(entry) || !value) continue;
    if (entry.key === "title") {
      make(entry, "field", value, "edit");
    } else if (value.toLowerCase() === "true" && !entry.list.length) {
      make(entry, "field", entry.key, "edit");
    } else if (value.toLowerCase() === "false" && !entry.list.length) {
      continue;
    } else {
      make(entry, "field", `${entry.key} ${value}`, "edit", entry.key);
    }
  }

  return chips.length ? chips : null;
}

// The value characters on `key`'s line: inside the quotes when quoted, and
// without a trailing ` # comment`. An empty value is an empty span at the end
// of the line. Offsets are relative to `blockText`.
export function frontmatterValueSpan(blockText: string, key: string): { from: number; to: number } | null {
  let offset = 0;
  for (const raw of blockText.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    const match = KEY_LINE.exec(line);
    if (match && match[1] === key) {
      const rest = match[2];
      if (rest === undefined) return { from: offset + line.length, to: offset + line.length };
      const from = offset + line.length - rest.length;
      const quote = rest[0];
      if (quote === '"' || quote === "'") {
        const closing = quote === '"' ? /^"(?:[^"\\]|\\.)*"/.exec(rest) : /^'(?:[^']|'')*'/.exec(rest);
        if (closing) return { from: from + 1, to: from + closing[0].length - 1 };
      }
      const bare = rest.replace(/\s+#.*$/, "");
      return { from, to: from + (bare.startsWith("#") ? 0 : bare.length) };
    }
    offset += raw.length + 1;
  }
  return null;
}

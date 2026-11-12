// Tidy Note: three mechanical clean-ups, applied together and never
// touching what the text says. Tables get aligned columns, headings get a
// blank line around them, and ordered lists are renumbered. Frontmatter and
// fenced code are left exactly as typed. Pure: text in, text out.

const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const HEADING = /^ {0,3}#{1,6}(?:[ \t]|$)/;
const ORDERED_ITEM = /^([ \t]*)(\d{1,9})([.)])([ \t]+)/;
const BLANK = /^[ \t]*$/;

// Lines that are frontmatter or inside a fenced block (fence lines included).
function protectedLines(lines: string[]): boolean[] {
  const skip = new Array<boolean>(lines.length).fill(false);
  let index = 0;
  if (lines[0]?.trim() === "---") {
    const end = lines.findIndex((line, i) => i > 0 && line.trim() === "---");
    if (end > 0) {
      for (; index <= end; index++) skip[index] = true;
    }
  }
  let fence: string | null = null;
  for (; index < lines.length; index++) {
    const match = FENCE.exec(lines[index]);
    if (match) {
      const marker = match[1];
      if (!fence) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length) {
        skip[index] = true;
        fence = null;
        continue;
      }
    }
    if (fence) skip[index] = true;
  }
  return skip;
}

// ── Tables ────────────────────────────────────────────────────────────────

// "none" is a bare `---`; "left" is an explicit `:---`.
type Align = "none" | "left" | "right" | "center";

function splitRow(line: string): string[] {
  let body = line.trim();
  if (body.startsWith("|")) body = body.slice(1);
  if (body.endsWith("|") && !body.endsWith("\\|")) body = body.slice(0, -1);
  const cells: string[] = [];
  let current = "";
  for (let i = 0; i < body.length; i++) {
    if (body[i] === "\\" && body[i + 1] === "|") {
      current += "\\|";
      i++;
    } else if (body[i] === "|") {
      cells.push(current.trim());
      current = "";
    } else current += body[i];
  }
  cells.push(current.trim());
  return cells;
}

const DELIMITER_CELL = /^:?-+:?$/;

function delimiterAligns(line: string): Align[] | null {
  if (!line.includes("-") || !line.includes("|")) return null;
  const cells = splitRow(line);
  if (!cells.every((cell) => DELIMITER_CELL.test(cell))) return null;
  return cells.map((cell) => {
    const left = cell.startsWith(":");
    const right = cell.endsWith(":");
    return left && right ? "center" : right ? "right" : left ? "left" : "none";
  });
}

const width = (text: string) => Array.from(text).length;

function pad(text: string, size: number, align: Align): string {
  const gap = size - width(text);
  if (gap <= 0) return text;
  if (align === "right") return " ".repeat(gap) + text;
  if (align === "center") {
    const before = Math.floor(gap / 2);
    return " ".repeat(before) + text + " ".repeat(gap - before);
  }
  return text + " ".repeat(gap);
}

function alignedTable(indent: string, rows: string[][], aligns: Align[]): string[] {
  const sizes = aligns.map((_, col) => Math.max(3, ...rows.map((row) => width(row[col] ?? ""))));
  const render = (cells: string[]) =>
    `${indent}| ${cells.map((cell, col) => pad(cell, sizes[col], aligns[col])).join(" | ")} |`.replace(/ +$/, "");
  const delimiter = aligns.map((align, col) => {
    const marks = align === "center" ? 2 : align === "none" ? 0 : 1;
    const dashes = "-".repeat(sizes[col] - marks);
    return align === "center" ? `:${dashes}:` : align === "right" ? `${dashes}:` : align === "left" ? `:${dashes}` : dashes;
  });
  return [
    render(rows[0]),
    `${indent}| ${delimiter.join(" | ")} |`,
    ...rows.slice(1).map(render),
  ];
}

function alignTables(lines: string[]): string[] {
  const skip = protectedLines(lines);
  const out = [...lines];
  for (let i = 0; i < lines.length - 1; i++) {
    if (skip[i] || skip[i + 1] || !lines[i].includes("|") || lines[i].trimStart().startsWith(">")) continue;
    const aligns = delimiterAligns(lines[i + 1]);
    const header = splitRow(lines[i]);
    if (!aligns || header.length !== aligns.length) continue;

    let end = i + 2;
    while (end < lines.length && !skip[end] && !BLANK.test(lines[end]) && lines[end].includes("|")) end++;
    const rows = [header, ...lines.slice(i + 2, end).map(splitRow)];
    // A row longer than the header would lose cells; leave such a table be.
    if (rows.some((row) => row.length > aligns.length)) {
      i = end - 1;
      continue;
    }
    const filled = rows.map((row) => [...row, ...new Array<string>(aligns.length - row.length).fill("")]);
    const indent = /^[ \t]*/.exec(lines[i])![0];
    out.splice(i, end - i, ...alignedTable(indent, filled, aligns));
    i = end - 1;
  }
  return out;
}

// ── Ordered lists ─────────────────────────────────────────────────────────

const indentWidth = (whitespace: string) => whitespace.replace(/\t/g, "    ").length;

interface ListLevel {
  indent: number;
  delimiter: string;
  first: number;
  /** 1 counts up; 0 keeps one number (a list typed as 1. 1. 1.). */
  step: 0 | 1;
  count: number;
}

function renumberLists(lines: string[]): string[] {
  const skip = protectedLines(lines);
  const stack: ListLevel[] = [];
  return lines.map((line, index) => {
    if (skip[index]) {
      stack.length = 0;
      return line;
    }
    if (BLANK.test(line)) return line;
    const item = ORDERED_ITEM.exec(line);
    const indent = indentWidth(item ? item[1] : /^[ \t]*/.exec(line)![0]);
    while (stack.length && stack[stack.length - 1].indent > indent) stack.pop();
    let level = stack[stack.length - 1];

    if (!item) {
      // Text at or left of an item's marker ends that list; deeper text continues it.
      if (level && level.indent >= indent) stack.pop();
      return line;
    }
    const [, lead, digits, delimiter, space] = item;
    if (level && level.indent === indent && level.delimiter !== delimiter) {
      stack.pop();
      level = stack[stack.length - 1];
    }
    if (!level || level.indent !== indent) {
      stack.push({ indent, delimiter, first: Number(digits), step: 1, count: 1 });
      return line;
    }
    // The second number sets the style: the same again keeps it, else count up.
    if (level.count === 1) level.step = Number(digits) === level.first ? 0 : 1;
    const written = String(level.first + level.count * level.step);
    level.count++;
    // A number that changes width would move the item's nested text; keep it.
    if (written.length !== digits.length) return line;
    return `${lead}${written}${delimiter}${space}${line.slice(item[0].length)}`;
  });
}

// ── Headings ──────────────────────────────────────────────────────────────

function spaceHeadings(lines: string[]): string[] {
  const skip = protectedLines(lines);
  const frontmatterEnd = lines[0]?.trim() === "---" ? lines.findIndex((line, i) => i > 0 && line.trim() === "---") : -1;
  const out: string[] = [];
  lines.forEach((line, index) => {
    // At the top or directly under the frontmatter, a heading needs no gap.
    const atTop = index === 0 || index - 1 === frontmatterEnd;
    if (!skip[index] && HEADING.test(line) && !atTop && !BLANK.test(out[out.length - 1])) out.push("");
    const afterHeading = index > 0 && !skip[index - 1] && HEADING.test(lines[index - 1]);
    if (afterHeading && !BLANK.test(line) && !BLANK.test(out[out.length - 1])) out.push("");
    out.push(line);
  });
  return out;
}

/** The note with its tables aligned, headings spaced and ordered lists renumbered. */
export function tidyNote(text: string): string {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  let lines = text.split(/\r?\n/);
  lines = alignTables(lines);
  lines = renumberLists(lines);
  lines = spaceHeadings(lines);
  return lines.join(eol);
}

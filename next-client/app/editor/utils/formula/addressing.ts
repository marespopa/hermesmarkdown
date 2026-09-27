// --- A1 addressing -----------------------------------------------------
// Column 0 -> "A", 1 -> "B", ... 25 -> "Z", 26 -> "AA", etc. Row 1 is the
// table's header row; row 2 is rows[0], row N is rows[N-2] (mirrors how a
// spreadsheet treats its own header row as row 1).

export function colIndexToLetter(index: number): string {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function letterToColIndex(letters: string): number {
  let n = 0;
  for (const ch of letters.toUpperCase()) {
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n - 1;
}

const CELL_REF_RE = /^([A-Za-z]+)(\d+)$/;

export function parseCellRef(ref: string): { row: number; col: number } | null {
  const m = CELL_REF_RE.exec(ref.trim());
  if (!m) return null;
  const row = parseInt(m[2], 10);
  if (row < 1) return null;
  return { row, col: letterToColIndex(m[1]) };
}

export interface RangeRef {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export function parseRangeRef(ref: string): RangeRef | null {
  const parts = ref.split(":");
  if (parts.length !== 2) return null;
  const a = parseCellRef(parts[0]);
  const b = parseCellRef(parts[1]);
  if (!a || !b) return null;
  return {
    startRow: Math.min(a.row, b.row),
    endRow: Math.max(a.row, b.row),
    startCol: Math.min(a.col, b.col),
    endCol: Math.max(a.col, b.col),
  };
}

export function isFormulaCell(text: string): boolean {
  if (!text) return false;
  const t = text.trim();
  return t.startsWith("=") && t.length > 1;
}

// --- Cross-file note references ----------------------------------------
// `[[Note]]!B4` / `[[Note#Heading]]!B4` inside a formula. Strips a trailing
// `#Heading` (table disambiguation, for notes with more than one table) and
// any `|alias`, then normalizes the name the same way note navigation does
// so lookups agree with `resolveFileMetaByName`.

export function normalizeNoteKey(raw: string): { key: string; heading: string | null } {
  const withoutAlias = raw.split("|")[0];
  const hashIdx = withoutAlias.indexOf("#");
  const namePart = (hashIdx === -1 ? withoutAlias : withoutAlias.slice(0, hashIdx)).trim();
  const heading = hashIdx === -1 ? null : withoutAlias.slice(hashIdx + 1).trim() || null;
  return { key: namePart.toLowerCase(), heading };
}

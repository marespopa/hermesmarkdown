import type { TableData, Alignment } from "./tableParser";


function alignSeparator(alignment: Alignment, width: number): string {
  const w = Math.max(width, 3);
  switch (alignment) {
    case "left":
      return ":" + "-".repeat(w - 1);
    case "center":
      return ":" + "-".repeat(Math.max(w - 2, 1)) + ":";
    case "right":
      return "-".repeat(w - 1) + ":";
  }
}

export function serializeTable(data: TableData, pretty = true): string {
  const { headers, rows, alignments } = data;
  const colCount = headers.length;

  if (!pretty) {
    const h = "| " + headers.join(" | ") + " |";
    const s = "| " + alignments.map((a) => alignSeparator(a, 3)).join(" | ") + " |";
    const r = rows.map((row) => "| " + row.join(" | ") + " |");
    return [h, s, ...r].join("\n");
  }

  // Calculate column widths across headers, rows, and minimum separator width
  const widths: number[] = Array(colCount).fill(3);
  for (let c = 0; c < colCount; c++) {
    widths[c] = Math.max(widths[c], headers[c]?.length ?? 0);
    for (const row of rows) {
      widths[c] = Math.max(widths[c], row[c]?.length ?? 0);
    }
  }

  const pad = (s: string = "", w: number, alignment: Alignment) => {
    const diff = w - s.length;
    if (diff <= 0) return s;
    if (alignment === "right") return s.padStart(w);
    if (alignment === "center") {
      const leftPad = Math.floor(diff / 2);
      return " ".repeat(leftPad) + s + " ".repeat(diff - leftPad);
    }
    return s.padEnd(w);
  };

  const hLine =
    "| " + headers.map((h, c) => pad(h, widths[c], alignments[c])).join(" | ") + " |";
  const sLine =
    "| " +
    alignments.map((a, c) => alignSeparator(a, widths[c])).join(" | ") +
    " |";
  const dLines = rows.map(
    (row) =>
      "| " + row.map((cell, c) => pad(cell, widths[c], alignments[c])).join(" | ") + " |",
  );

  return [hLine, sLine, ...dLines].join("\n");
}

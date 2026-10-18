// Tables inside a quote or callout (`> | a | b |`). The table code reads and
// writes rows that start with `|`, so a quoted table is read through a mask:
// each row's `>` prefix becomes spaces of the same length, which keeps every
// offset as it is in the document. Writes put the prefix back in place of
// those spaces (restoreQuotePrefix), so the table stays in its callout.

// A quoted table row: the `>` run (spaces before each allowed), then a pipe.
const REGEX_QUOTED_ROW = /^((?:[ \t]{0,3}>[ \t]?)+)(?=[ \t]*\|)/;

/** The row's `>` prefix ("> ", "> > "), or "" when it isn't a quoted table row. */
export function quotedRowPrefix(line: string): string {
  return REGEX_QUOTED_ROW.exec(line)?.[1] ?? "";
}

/** One line with its quoted-row prefix turned into spaces. */
export function maskQuotedRow(line: string): string {
  const prefix = quotedRowPrefix(line);
  return prefix ? " ".repeat(prefix.length) + line.slice(prefix.length) : line;
}

/** Every quoted table row's prefix as spaces; other lines as they are. */
export function maskQuotedRows(text: string): string {
  return text.includes(">") ? text.split("\n").map(maskQuotedRow).join("\n") : text;
}

/**
 * Puts `prefix` back at the start of each line of table text read through the
 * mask: over the line's first `prefix.length` spaces, or in place of its
 * leading spaces when it has fewer (a new row written without them).
 */
export function restoreQuotePrefix(text: string, prefix: string): string {
  if (!prefix) return text;
  return text
    .split("\n")
    .map((line) => {
      const spaces = /^[ \t]*/.exec(line)![0].length;
      return prefix + line.slice(Math.min(spaces, prefix.length));
    })
    .join("\n");
}

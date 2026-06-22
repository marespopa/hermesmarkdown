export type DiffToken = {
  value: string;
  type: "same" | "removed" | "added";
};

/** Splits on whitespace while keeping the separators as their own tokens, so the diff can recombine cleanly. */
function tokenize(text: string): string[] {
  return text.match(/\s+|[^\s]+/g) ?? [];
}

/**
 * Word-level diff via LCS. Good enough for short AI-rewrite previews;
 * not optimized for large documents.
 */
export function diffWords(oldText: string, newText: string): DiffToken[] {
  const a = tokenize(oldText);
  const b = tokenize(newText);

  const lengths: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0)
  );

  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lengths[i][j] =
        a[i] === b[j] ? lengths[i + 1][j + 1] + 1 : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
    }
  }

  const tokens: DiffToken[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      tokens.push({ value: a[i], type: "same" });
      i++;
      j++;
    } else if (lengths[i + 1][j] >= lengths[i][j + 1]) {
      tokens.push({ value: a[i], type: "removed" });
      i++;
    } else {
      tokens.push({ value: b[j], type: "added" });
      j++;
    }
  }
  while (i < a.length) {
    tokens.push({ value: a[i], type: "removed" });
    i++;
  }
  while (j < b.length) {
    tokens.push({ value: b[j], type: "added" });
    j++;
  }

  return tokens;
}

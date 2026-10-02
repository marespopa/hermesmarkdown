export const FM_REGEX = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n)?/;

export function parseFmFields(content: string): Record<string, string> {
  const m = FM_REGEX.exec(content);
  if (!m) return {};
  const fields: Record<string, string> = {};
  const lines = m[1].split(/\r?\n/);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const lm = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)/);
    if (!lm) { i++; continue; }

    const key = lm[1];
    const rawVal = lm[2].trim();
    i++;

    const continuation: string[] = [];
    while (i < lines.length && /^\s/.test(lines[i])) {
      continuation.push(lines[i]);
      i++;
    }

    const isBlockScalar = rawVal === "|" || rawVal === ">";
    const isFlowArray = rawVal.startsWith("[") && rawVal.endsWith("]");
    const isEmptyArray = rawVal === "[]";

    if (isBlockScalar && continuation.length > 0) {
      fields[key] = continuation.map((l) => l.trim()).filter(Boolean).join("\n");
    } else if ((isEmptyArray || rawVal === "") && continuation.some((l) => /^\s*-\s/.test(l))) {
      fields[key] = continuation
        .filter((l) => /^\s*-\s/.test(l))
        .map((l) => l.replace(/^\s*-\s+/, "").trim())
        .join(", ");
    } else if (isFlowArray) {
      fields[key] = rawVal.slice(1, -1).trim();
    } else {
      fields[key] = rawVal.replace(/^"|"$/g, "");
    }
  }

  return fields;
}

/** Mimics the list normalization serializeField applies, so live-typing inputs
 *  can tell whether an incoming value is just their own edit echoed back. */
export function normalizeListString(val: string): string {
  return val.split(",").map((s) => s.trim()).filter(Boolean).join(", ");
}

export function serializeField(key: string, val: string): string {
  const isListField = ["tags"].includes(key);
  const isBareField = ["status", "sensitive", "private"].includes(key);

  if (isListField) {
    return `${key}: [${normalizeListString(val)}]`;
  }
  if (isBareField) {
    return `${key}: ${val}`;
  }
  if (val.includes("\n")) {
    const indented = val.split("\n").map((l) => `  ${l}`).join("\n");
    return `${key}: |\n${indented}`;
  }
  return `${key}: "${val}"`;
}

/** Sets each field to its value; a `null` value removes the field (and any
 *  continuation lines) instead. */
export function updateFmFields(
  content: string,
  edits: Record<string, string | null>,
): string {
  const m = FM_REGEX.exec(content);

  if (!m) {
    const newLines = Object.entries(edits)
      .filter((entry): entry is [string, string] => entry[1] !== null && entry[1].trim() !== "")
      .map(([key, val]) => serializeField(key, val));
    if (newLines.length === 0) return content;
    return `---\n${newLines.join("\n")}\n---\n\n${content.trim()}`;
  }

  const seen = new Set<string>();
  const lines = m[1].split(/\r?\n/);
  const updatedLines: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const lm = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)/);
    if (lm && lm[1] in edits) {
      const key = lm[1];
      const val = edits[key];
      seen.add(key);
      if (val !== null) updatedLines.push(serializeField(key, val));
      i++;
      while (i < lines.length && /^\s/.test(lines[i])) i++;
    } else {
      updatedLines.push(line);
      i++;
    }
  }

  for (const [key, val] of Object.entries(edits)) {
    if (!seen.has(key) && val !== null && val.trim() !== "") {
      updatedLines.push(serializeField(key, val));
    }
  }

  return `---\n${updatedLines.join("\n")}\n---\n` + content.slice(m[0].length);
}

import type { SchemaField, VaultSchema } from "@/app/services/vault-schema";

export const FM_REGEX = /^---\n([\s\S]*?)\n---\n?/;

export function parseFmFields(content: string): Record<string, string> {
  const m = FM_REGEX.exec(content);
  if (!m) return {};
  const fields: Record<string, string> = {};
  const lines = m[1].split("\n");

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
      fields[key] = rawVal.replace(/^"|"$/g, "").trim();
    }
  }

  return fields;
}

export function serializeField(key: string, val: string, field?: SchemaField): string {
  const isListField =
    field?.type === "list" ||
    (!field && ["tags", "read_when", "related", "edit_elsewhere"].includes(key));
  const isBareField = field?.type === "enum" || (!field && key === "status");

  if (isListField) {
    const items = val.split(",").map((s) => s.trim()).filter(Boolean);
    return `${key}: [${items.join(", ")}]`;
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

export function updateFmFields(
  content: string,
  edits: Record<string, string>,
  schema?: VaultSchema,
): string {
  const fieldMap = new Map(schema?.fields.map((f) => [f.key, f]));
  const m = FM_REGEX.exec(content);

  if (!m) {
    const newLines = Object.entries(edits)
      .filter(([, val]) => val.trim() !== "")
      .map(([key, val]) => serializeField(key, val, fieldMap.get(key)));
    if (newLines.length === 0) return content;
    return `---\n${newLines.join("\n")}\n---\n\n${content.trim()}`;
  }

  const seen = new Set<string>();
  const lines = m[1].split("\n");
  const updatedLines: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const lm = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)/);
    if (lm && lm[1] in edits) {
      const key = lm[1];
      seen.add(key);
      updatedLines.push(serializeField(key, edits[key], fieldMap.get(key)));
      i++;
      while (i < lines.length && /^\s/.test(lines[i])) i++;
    } else {
      updatedLines.push(line);
      i++;
    }
  }

  for (const [key, val] of Object.entries(edits)) {
    if (!seen.has(key) && val.trim() !== "") {
      updatedLines.push(serializeField(key, val, fieldMap.get(key)));
    }
  }

  return `---\n${updatedLines.join("\n")}\n---\n` + content.slice(m[0].length);
}

// Reads `.hermes/index.yaml` back into structured entries. This is the
// counterpart to buildYaml() in vault-index.ts (write-only today) — parses
// the exact shape that writer produces, nothing more general.

export interface VaultIndexEntry {
  path: string;
  title: string | null;
  status: string | null;
  scope: string | null;
  read_when: string[];
  related: string[];
  tags: string[];
}

export interface VaultIndexTaskEntry {
  path: string;
  line: number;
  text: string;
}

export interface VaultIndex {
  version: number;
  generated: string | null;
  entries: VaultIndexEntry[];
  tasks: {
    prog: VaultIndexTaskEntry[];
    todo: VaultIndexTaskEntry[];
  };
}

function unquote(raw: string): string {
  const s = raw.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  return s;
}

// Splits a YAML flow array `[a, "b, c", d]` into items, respecting quotes
// so commas inside quoted strings (e.g. "keywords: a, b, c") aren't split on.
function parseFlowArray(raw: string): string[] {
  const s = raw.trim();
  if (!s.startsWith("[")) return [];
  const inner = s.slice(1, s.endsWith("]") ? -1 : undefined);

  const items: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (quote) {
      current += ch;
      if (ch === quote && inner[i - 1] !== "\\") quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
    } else if (ch === ",") {
      items.push(unquote(current));
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) items.push(unquote(current));
  return items.filter(Boolean);
}

// Parses a single self-authored flow-mapping line like
// `- {path: a/b.md, line: 3, text: "Ship it"}`
// into a key -> raw-value map, quote-aware so commas inside quoted text
// don't split fields early.
function parseFlowMap(raw: string): Record<string, string> {
  const s = raw.trim();
  const inner = s.startsWith("{") ? s.slice(1, s.endsWith("}") ? -1 : undefined) : s;
  const parts: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (quote) {
      current += ch;
      if (ch === quote && inner[i - 1] !== "\\") quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
    } else if (ch === ",") {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);

  const map: Record<string, string> = {};
  for (const part of parts) {
    const idx = part.indexOf(":");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    map[key] = value;
  }
  return map;
}

function parseTaskLine(raw: string): VaultIndexTaskEntry | null {
  const map = parseFlowMap(raw.trim().replace(/^-\s*/, ""));
  if (!map.path) return null;
  return {
    path: unquote(map.path),
    line: parseInt(map.line, 10) || 0,
    text: parseScalarOrNull(map.text) || "",
  };
}

function parseScalarOrNull(raw: string): string | null {
  const s = raw.trim();
  if (s === "" || s === "null") return null;
  return unquote(s);
}

type Section = "files" | "tasks";
type TaskBucket = "prog" | "todo" | null;

export function parseVaultIndex(yamlText: string): VaultIndex {
  const lines = yamlText.split("\n");

  let version = 1;
  let generated: string | null = null;
  const entries: VaultIndexEntry[] = [];
  let current: VaultIndexEntry | null = null;
  let section: Section = "files";
  let taskBucket: TaskBucket = null;
  const tasks: { prog: VaultIndexTaskEntry[]; todo: VaultIndexTaskEntry[] } = {
    prog: [],
    todo: [],
  };

  const flush = () => {
    if (current) entries.push(current);
    current = null;
  };

  for (const line of lines) {
    if (!line.trim()) continue;
    const indent = line.length - line.trimStart().length;
    const trimmed = line.trim();

    if (indent === 0) {
      if (trimmed === "files:") {
        section = "files";
        flush();
        continue;
      }
      if (trimmed === "tasks:") {
        section = "tasks";
        taskBucket = null;
        flush();
        continue;
      }
      const m = trimmed.match(/^(\w+):\s*(.*)/);
      if (m) {
        if (m[1] === "version") version = parseInt(m[2], 10) || 1;
        if (m[1] === "generated") generated = parseScalarOrNull(m[2]);
      }
      continue;
    }

    if (section === "files") {
      if (indent === 2) {
        const itemMatch = trimmed.match(/^-\s+path:\s*(.*)/);
        if (itemMatch) {
          flush();
          current = {
            path: itemMatch[1].trim(),
            title: null,
            status: null,
            scope: null,
            read_when: [],
            related: [],
            tags: [],
          };
        }
        continue;
      }

      if (indent === 4 && current) {
        const m = trimmed.match(/^(\w+):\s*(.*)/);
        if (!m) continue;
        const [, key, value] = m;
        switch (key) {
          case "title": current.title = parseScalarOrNull(value); break;
          case "status": current.status = parseScalarOrNull(value); break;
          case "scope": current.scope = parseScalarOrNull(value); break;
          case "read_when": current.read_when = parseFlowArray(value); break;
          case "related": current.related = parseFlowArray(value); break;
          case "tags": current.tags = parseFlowArray(value); break;
        }
      }
      continue;
    }

    // section === "tasks"
    if (indent === 2) {
      if (trimmed === "prog:") taskBucket = "prog";
      else if (trimmed === "todo:") taskBucket = "todo";
      continue;
    }
    if (indent === 4 && taskBucket && trimmed.startsWith("-")) {
      const task = parseTaskLine(trimmed);
      if (task) tasks[taskBucket].push(task);
    }
  }

  flush();
  return { version, generated, entries, tasks };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FieldType = "string" | "enum" | "list" | "date" | "boolean" | "number";

export interface SchemaField {
  key: string;
  type: FieldType;
  required: boolean;
  default?: string;
  description?: string;
  values?: string[];
  item_type?: string;
  sync_with_tag?: boolean;
}

export interface VaultSchema {
  version: number;
  fields: SchemaField[];
  agent_context?: {
    entry_point?: string;
    file_template?: string;
  };
}

// ---------------------------------------------------------------------------
// Default schemas
// ---------------------------------------------------------------------------

export const DEFAULT_SCHEMA: VaultSchema = {
  version: 1,
  fields: [
    { key: "title", type: "string", required: true, default: "" },
    {
      key: "status",
      type: "enum",
      values: ["draft", "review", "active", "archived"],
      required: true,
      default: "draft",
      sync_with_tag: true,
    },
    {
      key: "scope",
      type: "string",
      required: false,
      description: "One-line summary for agent context",
    },
    { key: "read_when", type: "list", required: false },
    { key: "related", type: "list", item_type: "wikilink", required: false },
    { key: "edit_elsewhere", type: "list", required: false },
    { key: "tags", type: "list", required: false },
  ],
  agent_context: {
    entry_point: ".hermes/AGENTS.md",
    file_template: ".hermes/template.md",
  },
};

export const NEW_VAULT_SCHEMA: VaultSchema = {
  version: 1,
  fields: [
    { key: "title", type: "string", required: true, default: "" },
    {
      key: "status",
      type: "enum",
      values: ["draft", "review", "active", "archived"],
      required: true,
      default: "draft",
      sync_with_tag: true,
    },
    {
      key: "scope",
      type: "string",
      required: false,
      description: "One-line summary for agent context",
    },
    { key: "read_when", type: "list", required: false },
    { key: "related", type: "list", item_type: "wikilink", required: false },
    { key: "tags", type: "list", required: false },
  ],
  agent_context: {
    entry_point: ".hermes/AGENTS.md",
    file_template: ".hermes/template.md",
  },
};

// ---------------------------------------------------------------------------
// Simple djb2 hash for staleness detection
// ---------------------------------------------------------------------------

export function hashSchema(s: string): string {
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = (((hash << 5) + hash) + s.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash).toString(16);
}

// ---------------------------------------------------------------------------
// YAML parser — handles only the schema.yaml subset we generate
// ---------------------------------------------------------------------------

function parseYamlValue(raw: string): string {
  const s = raw.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function parseFlowArray(raw: string): string[] {
  const s = raw.trim();
  if (!s.startsWith("[")) return [];
  return s.slice(1, -1).split(",").map((x) => x.trim()).filter(Boolean);
}

function applyFieldProp(field: Partial<SchemaField>, key: string, rawValue: string): void {
  switch (key) {
    case "key": field.key = parseYamlValue(rawValue); break;
    case "type": field.type = parseYamlValue(rawValue) as FieldType; break;
    case "required": field.required = rawValue.trim() === "true"; break;
    case "default": field.default = parseYamlValue(rawValue); break;
    case "description": field.description = parseYamlValue(rawValue); break;
    case "item_type": field.item_type = parseYamlValue(rawValue); break;
    case "sync_with_tag": field.sync_with_tag = rawValue.trim() === "true"; break;
    case "values": field.values = parseFlowArray(rawValue); break;
  }
}

export function parseSchemaYaml(yaml: string): VaultSchema {
  const result: VaultSchema = { version: 1, fields: [], agent_context: {} };
  const lines = yaml.split("\n");

  type State = "top" | "fields" | "agent-context";
  let state: State = "top";
  let currentField: Partial<SchemaField> | null = null;

  const flushField = () => {
    if (currentField && currentField.key && currentField.type) {
      result.fields.push({
        key: currentField.key,
        type: currentField.type,
        required: currentField.required ?? false,
        ...currentField,
      } as SchemaField);
    }
    currentField = null;
  };

  for (const line of lines) {
    const trimmed = line.trimStart();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const indent = line.length - trimmed.length;

    if (indent === 0) {
      flushField();
      if (trimmed === "fields:") {
        state = "fields";
      } else if (trimmed === "agent_context:") {
        state = "agent-context";
      } else {
        const m = trimmed.match(/^(\w+):\s*(.*)/);
        if (m && m[1] === "version") result.version = parseInt(m[2]) || 1;
        state = "top";
      }
    } else if (indent === 2) {
      if (state === "fields") {
        // "  - key: ..." starts a new list item
        const itemM = trimmed.match(/^-\s+(\w+):\s*(.*)/);
        if (itemM) {
          flushField();
          currentField = {};
          applyFieldProp(currentField, itemM[1], itemM[2]);
        }
      } else if (state === "agent-context") {
        const m = trimmed.match(/^(\w+):\s*(.*)/);
        if (m && result.agent_context) {
          if (m[1] === "entry_point") result.agent_context.entry_point = parseYamlValue(m[2]);
          else if (m[1] === "file_template") result.agent_context.file_template = parseYamlValue(m[2]);
        }
      }
    } else if (indent === 4) {
      if (state === "fields" && currentField) {
        const m = trimmed.match(/^(\w+):\s*(.*)/);
        if (m) applyFieldProp(currentField, m[1], m[2]);
      }
    }
  }

  flushField();
  return result;
}

// ---------------------------------------------------------------------------
// YAML serializer
// ---------------------------------------------------------------------------

export function serializeSchema(schema: VaultSchema): string {
  const lines: string[] = [`version: ${schema.version}`, ""];

  lines.push("fields:");
  for (const field of schema.fields) {
    lines.push(`  - key: ${field.key}`);
    lines.push(`    type: ${field.type}`);
    lines.push(`    required: ${field.required}`);
    if (field.default !== undefined) {
      const def = field.default === "" ? '""' : field.default;
      lines.push(`    default: ${def}`);
    }
    if (field.values && field.values.length > 0) {
      lines.push(`    values: [${field.values.join(", ")}]`);
    }
    if (field.item_type) lines.push(`    item_type: ${field.item_type}`);
    if (field.description) lines.push(`    description: "${field.description}"`);
    if (field.sync_with_tag) lines.push(`    sync_with_tag: true`);
    lines.push("");
  }

  if (schema.agent_context) {
    lines.push("agent_context:");
    if (schema.agent_context.entry_point) {
      lines.push(`  entry_point: ${schema.agent_context.entry_point}`);
    }
    if (schema.agent_context.file_template) {
      lines.push(`  file_template: ${schema.agent_context.file_template}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// template.md generator
// ---------------------------------------------------------------------------

export function generateTemplateMd(schema: VaultSchema): string {
  const fmLines: string[] = ["---"];

  for (const field of schema.fields) {
    const def = field.default ?? "";
    if (field.type === "list") {
      fmLines.push(`${field.key}: []`);
    } else if (field.type === "enum") {
      fmLines.push(`${field.key}: ${def || (field.values?.[0] ?? "")}`);
    } else if (field.type === "boolean") {
      fmLines.push(`${field.key}: false`);
    } else {
      fmLines.push(`${field.key}: "${def}"`);
    }
  }

  fmLines.push("---");
  fmLines.push("");
  return fmLines.join("\n");
}

// ---------------------------------------------------------------------------
// AGENTS.md generator
// ---------------------------------------------------------------------------

export function generateAgentsMd(
  vaultName: string,
  schema: VaultSchema,
  schemaHash: string,
  folderTree?: string,
): string {
  const now = new Date().toISOString();

  const requiredFields = schema.fields
    .filter((f) => f.required)
    .map((f) => `- \`${f.key}\` (${f.type})${f.description ? ` — ${f.description}` : ""}`)
    .join("\n");

  const allFields = schema.fields
    .map((f) => {
      const parts = [`- \`${f.key}\` (${f.type}${f.required ? ", required" : ""})`];
      if (f.description) parts.push(` — ${f.description}`);
      if (f.values) parts.push(` — values: ${f.values.join(", ")}`);
      return parts.join("");
    })
    .join("\n");

  const syncField = schema.fields.find((f) => f.sync_with_tag);

  const statusSection = syncField
    ? `\n## Lifecycle Tags\nDocument: draft → review → active → archived  \nTask: todo → prog → done\n`
    : "";

  const structureSection = folderTree
    ? `\n## Vault Structure\n\`\`\`\n${folderTree}\n\`\`\`\n`
    : "";

  return `---
schema_hash: "${schemaHash}"
generated: "${now}"
---

# Vault: ${vaultName}
Generated: ${now} — do not edit manually, this file is managed by HermesMarkdown.

## Schema
All files in this vault use the frontmatter schema defined in \`.hermes/schema.yaml\`.
Read that file before creating or editing any note.

## File Creation
Copy \`.hermes/template.md\` as the base for every new file.
Fill in all required fields before writing content.

## Required Fields
${requiredFields || "No required fields defined."}

## All Fields
${allFields}

## Conventions
- status: draft for all new files unless instructed otherwise
- read_when: describe when this file is relevant to load as context
- related: use [[WikiLink]] syntax; links must resolve to existing files
- tags: use existing vault tags where possible
- Unknown fields not in schema: preserve as-is, do not strip
${statusSection}${structureSection}`;
}

// ---------------------------------------------------------------------------
// Folder tree helper (max 2 levels)
// ---------------------------------------------------------------------------

async function buildFolderTree(vaultHandle: FileSystemDirectoryHandle): Promise<string> {
  const lines: string[] = [`${vaultHandle.name}/`];
  const topEntries: string[] = [];

  for await (const entry of (vaultHandle as any).values()) {
    if (entry.kind === "directory" && !entry.name.startsWith(".")) {
      topEntries.push(entry.name);
    }
  }
  topEntries.sort();

  for (let i = 0; i < topEntries.length; i++) {
    const isLast = i === topEntries.length - 1;
    const prefix = isLast ? "└── " : "├── ";
    lines.push(`${prefix}${topEntries[i]}/`);

    try {
      const subHandle = await (vaultHandle as any).getDirectoryHandle(topEntries[i]);
      const subEntries: string[] = [];
      for await (const sub of (subHandle as any).values()) {
        if (sub.kind === "directory" && !sub.name.startsWith(".")) {
          subEntries.push(sub.name);
        }
      }
      subEntries.sort();
      for (let j = 0; j < subEntries.length; j++) {
        const subIsLast = j === subEntries.length - 1;
        const subBranch = isLast ? "    " : "│   ";
        const subPrefix = subIsLast ? "└── " : "├── ";
        lines.push(`${subBranch}${subPrefix}${subEntries[j]}/`);
      }
    } catch {
      // skip unreadable dirs
    }
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// FS operations
// ---------------------------------------------------------------------------

export async function readVaultSchema(
  vaultHandle: FileSystemDirectoryHandle,
): Promise<VaultSchema | null> {
  try {
    const hermesDir = await vaultHandle.getDirectoryHandle(".hermes");
    const fileHandle = await hermesDir.getFileHandle("schema.yaml");
    const file = await fileHandle.getFile();
    const text = await file.text();
    return parseSchemaYaml(text);
  } catch {
    return null;
  }
}

export async function readDriveVaultSchema(folderId: string): Promise<VaultSchema | null> {
  try {
    const { listFiles, getFileContent, FOLDER_MIME } = await import("./drive/client");
    const { files: rootFiles } = await listFiles(folderId);
    const hermesFolder = rootFiles.find(f => f.mimeType === FOLDER_MIME && f.name === ".hermes");
    if (!hermesFolder) return null;
    const { files: hermesFiles } = await listFiles(hermesFolder.id);
    const schemaFile = hermesFiles.find(f => f.name === "schema.yaml");
    if (!schemaFile) return null;
    const text = await getFileContent(schemaFile.id);
    return parseSchemaYaml(text);
  } catch {
    return null;
  }
}

export async function writeVaultSchema(
  schema: VaultSchema,
  vaultHandle: FileSystemDirectoryHandle,
): Promise<void> {
  const hermesDir = await vaultHandle.getDirectoryHandle(".hermes", { create: true });
  let fileHandle = await hermesDir.getFileHandle("schema.yaml", { create: true });
  let writable;
  try {
    writable = await fileHandle.createWritable();
  } catch (err: any) {
    if (err.name === "InvalidStateError") {
      fileHandle = await hermesDir.getFileHandle("schema.yaml", { create: true });
      writable = await fileHandle.createWritable();
    } else {
      throw err;
    }
  }
  await writable.write(serializeSchema(schema));
  await writable.close();
}

async function readAgentsMdHash(vaultHandle: FileSystemDirectoryHandle): Promise<string | null> {
  try {
    const hermesDir = await vaultHandle.getDirectoryHandle(".hermes");
    const fileHandle = await hermesDir.getFileHandle("AGENTS.md");
    const file = await fileHandle.getFile();
    const text = await file.text();
    const m = text.match(/schema_hash:\s*"?([a-f0-9]+)"?/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

async function writeHermesFile(
  vaultHandle: FileSystemDirectoryHandle,
  filename: string,
  content: string,
): Promise<void> {
  const hermesDir = await vaultHandle.getDirectoryHandle(".hermes", { create: true });
  let fileHandle = await hermesDir.getFileHandle(filename, { create: true });
  let writable;
  try {
    writable = await fileHandle.createWritable();
  } catch (err: any) {
    if (err.name === "InvalidStateError") {
      fileHandle = await hermesDir.getFileHandle(filename, { create: true });
      writable = await fileHandle.createWritable();
    } else {
      throw err;
    }
  }
  await writable.write(content);
  await writable.close();
}

/**
 * Ensures `.hermes/schema.yaml`, `AGENTS.md`, and `template.md` are present
 * and up-to-date. Returns the active schema.
 *
 * - If schema.yaml is missing: writes default schema for existing vaults, or
 *   new-vault schema if isNewVault is true.
 * - AGENTS.md and template.md are regenerated if the schema hash changed.
 */
export async function ensureHermesFiles(
  vaultHandle: FileSystemDirectoryHandle,
  isNewVault = false,
): Promise<{ schema: VaultSchema; schemaCreated: boolean }> {
  let schema = await readVaultSchema(vaultHandle);
  let schemaCreated = false;

  if (!schema) {
    schema = isNewVault ? NEW_VAULT_SCHEMA : DEFAULT_SCHEMA;
    await writeVaultSchema(schema, vaultHandle);
    schemaCreated = true;
  }

  const schemaYaml = serializeSchema(schema);
  const currentHash = hashSchema(schemaYaml);
  const storedHash = await readAgentsMdHash(vaultHandle);

  if (storedHash !== currentHash) {
    let folderTree: string | undefined;
    try {
      folderTree = await buildFolderTree(vaultHandle);
    } catch {
      // non-critical
    }
    const agentsMd = generateAgentsMd(vaultHandle.name, schema, currentHash, folderTree);
    const templateMd = generateTemplateMd(schema);
    await writeHermesFile(vaultHandle, "AGENTS.md", agentsMd);
    await writeHermesFile(vaultHandle, "template.md", templateMd);
  }

  return { schema, schemaCreated };
}

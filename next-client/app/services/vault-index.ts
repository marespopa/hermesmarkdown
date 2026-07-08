import { FileMetadata } from "@/app/atoms/metadata";

function stripQuotes(s: string | undefined | null): string {
  if (!s) return "";
  return s.replace(/^["']|["']$/g, "").trim();
}

function yamlScalar(raw: string | undefined | null): string {
  if (!raw || raw.trim() === "" || raw.trim() === "[]") return "null";
  const s = raw.trim();
  if (s.startsWith("[")) return s; // pass through flow arrays unchanged
  const stripped = stripQuotes(s);
  if (!stripped) return "null";
  if (/[:#"'\[\]{},|>&*?!@%`]/.test(stripped) || stripped.includes("\n")) {
    return `"${stripped.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return stripped;
}

function buildYaml(fileMetadata: Record<string, FileMetadata>): string {
  const lines: string[] = [
    "version: 1",
    `generated: ${new Date().toISOString()}`,
    "files:",
  ];

  const entries = Object.values(fileMetadata).filter(
    (e) => !e.path.startsWith(".hermes/"),
  );

  if (entries.length === 0) {
    lines.push("  []");
  } else {
    for (const entry of entries) {
      const fm = entry.frontmatter || {};
      // Title fallback: frontmatter title -> first H1 (already promoted into
      // fm.title by the metadata worker) -> filename.
      const title = stripQuotes(fm.title) || entry.name.replace(/\.md$/, "");
      const status = fm.status ? stripQuotes(fm.status) : "null";
      const scope = yamlScalar(fm.scope);
      const readWhen = fm.read_when ? yamlScalar(fm.read_when) : "null";
      const related = fm.related ? yamlScalar(fm.related) : "null";
      const tags =
        entry.tags.length > 0 ? `[${entry.tags.join(", ")}]` : "[]";

      lines.push(`  - path: ${entry.path}`);
      lines.push(`    title: ${yamlScalar(title)}`);
      lines.push(`    status: ${status}`);
      lines.push(`    scope: ${scope}`);
      lines.push(`    read_when: ${readWhen}`);
      lines.push(`    related: ${related}`);
      lines.push(`    tags: ${tags}`);
    }
  }

  // Outstanding Tasks — aggregated across all files so an agent can answer
  // "what's outstanding in this vault" from a single read, without opening
  // every note. Only unchecked checklist items are listed.
  const openTasks = entries.flatMap((e) =>
    (e.tasks || [])
      .filter((t) => !t.checked)
      .map((t) => ({ ...t, filePath: e.path })),
  );
  const prog = openTasks.filter((t) => t.inProgress);
  const todo = openTasks.filter((t) => !t.inProgress);

  const taskLine = (t: (typeof openTasks)[number]) =>
    `    - {path: ${t.filePath}, line: ${t.line}, text: ${yamlScalar(t.text)}}`;

  lines.push("tasks:");
  lines.push("  prog:");
  if (prog.length === 0) lines.push("    []");
  else prog.forEach((t) => lines.push(taskLine(t)));
  lines.push("  todo:");
  if (todo.length === 0) lines.push("    []");
  else todo.forEach((t) => lines.push(taskLine(t)));

  return lines.join("\n") + "\n";
}

export async function writeVaultIndex(
  fileMetadata: Record<string, FileMetadata>,
  vaultHandle: FileSystemDirectoryHandle,
): Promise<void> {
  const yaml = buildYaml(fileMetadata);
  const hermesDir = await vaultHandle.getDirectoryHandle(".hermes", {
    create: true,
  });
  const fileHandle = await hermesDir.getFileHandle("index.yaml", {
    create: true,
  });
  const writable = await fileHandle.createWritable();
  await writable.write(yaml);
  await writable.close();
}

// Drive allows multiple files with the same name in one folder, so the
// find-existing-then-create/update sequence below is a check-then-act race:
// two callers (e.g. a save-triggered write and the debounced worker-driven
// write) can both see "no index.yaml yet" and both create one, producing
// duplicate `.hermes/index.yaml` files. Serialize writes per vault so each
// call sees the result of the previous one before deciding create vs. update.
const driveIndexWriteQueues = new Map<string, Promise<void>>();

export async function writeDriveVaultIndex(
  fileMetadata: Record<string, FileMetadata>,
  rootFolderId: string,
): Promise<void> {
  const previous = driveIndexWriteQueues.get(rootFolderId) ?? Promise.resolve();
  const next = previous
    .catch(() => {})
    .then(() => writeDriveVaultIndexUnsafe(fileMetadata, rootFolderId));
  driveIndexWriteQueues.set(rootFolderId, next);
  return next;
}

async function writeDriveVaultIndexUnsafe(
  fileMetadata: Record<string, FileMetadata>,
  rootFolderId: string,
): Promise<void> {
  const { listFiles, createFile, updateFile, createFolder, FOLDER_MIME } = await import("./drive/client");
  const yaml = buildYaml(fileMetadata);

  const { files: rootFiles } = await listFiles(rootFolderId);
  const hermesFolders = rootFiles.filter((f) => f.mimeType === FOLDER_MIME && f.name === ".hermes");
  const hermesFolder = hermesFolders[0] ?? (await createFolder(".hermes", rootFolderId));

  const { files: hermesFiles } = await listFiles(hermesFolder.id);
  const existing = hermesFiles.filter((f) => f.name === "index.yaml").sort((a, b) => a.id.localeCompare(b.id));
  if (existing.length > 0) {
    // Also self-heals a vault that already has duplicates from before this
    // fix: keep the first (stable, lowest-id) file, drop the rest.
    await updateFile(existing[0].id, yaml);
    for (const dupe of existing.slice(1)) {
      try {
        const { deleteFile } = await import("./drive/client");
        await deleteFile(dupe.id);
      } catch {
        // best-effort cleanup — leaving a stale duplicate is harmless
      }
    }
  } else {
    await createFile("index.yaml", hermesFolder.id, yaml);
  }
}

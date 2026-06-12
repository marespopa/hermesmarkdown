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

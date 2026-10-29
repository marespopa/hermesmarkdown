import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryDirectoryHandle } from "@/app/services/memory-file-system.test-utils";
import { collectVaultFiles, isSecretFile, listDirectoryEntries, resolveDirectory } from "./vault-scan";

async function makeVault() {
  const vault = new MemoryDirectoryHandle("vault");
  for (const path of [
    "a.md",
    "notes/b.md",
    "notes/deep/c.md",
    "notes/image.png",
    "notes/app.tsx",
    "data.json",
    ".env",
    ".env.local",
    "notes/.env.production",
    ".hermesmarkdown/index.yaml",
    ".hermesmarkdown/.env",
    ".obsidian/workspace.json",
    ".obsidian/snippets/readme.md",
    ".git/config",
    ".git/notes.md",
    "node_modules/pkg/README.md",
  ]) {
    await vault.writeText(path, "x");
  }
  return vault;
}

const paths = (result: { files: { path: string }[] }) => result.files.map((f) => f.path).sort();

describe("collectVaultFiles", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("collects notes only, skipping dotfolders and dependency folders", async () => {
    const result = await collectVaultFiles((await makeVault()).asHandle(), false);
    expect(paths(result)).toEqual(["a.md", "notes/b.md", "notes/deep/c.md"]);
    expect(result.timedOut).toBe(false);
  });

  it("with hidden files, adds notes in dotfolders and .hermesmarkdown data but never secrets or .git", async () => {
    const result = await collectVaultFiles((await makeVault()).asHandle(), true);
    expect(paths(result)).toEqual([
      ".hermesmarkdown/index.yaml",
      ".obsidian/snippets/readme.md",
      "a.md",
      "notes/b.md",
      "notes/deep/c.md",
    ]);
  });

  it("lists text and image files that aren't notes apart, never as notes and never secrets", async () => {
    const result = await collectVaultFiles((await makeVault()).asHandle(), false);
    expect(result.textFiles.map((f) => f.path).sort()).toEqual(["data.json", "notes/app.tsx", "notes/image.png"]);
    expect(paths(result)).not.toContain("data.json");
  });

  it("collects every folder walked, empty ones included", async () => {
    const vault = await makeVault();
    await vault.getDirectoryHandle("empty", { create: true });
    const notes = await vault.getDirectoryHandle("notes");
    await notes.getDirectoryHandle("empty-nested", { create: true });
    const result = await collectVaultFiles(vault.asHandle(), false);
    expect(result.folders.slice().sort()).toEqual(["empty", "notes", "notes/deep", "notes/empty-nested"]);
  });

  it("leaves out the stray empty document folder at the root but not elsewhere", async () => {
    const vault = new MemoryDirectoryHandle("vault");
    await vault.getDirectoryHandle("document", { create: true });
    await vault.writeText("notes/document/.keep", "x");
    const result = await collectVaultFiles(vault.asHandle(), false);
    expect(result.folders.slice().sort()).toEqual(["notes", "notes/document"]);
  });

  it("never indexes or lists the Trash, even with hidden files shown", async () => {
    const vault = await makeVault();
    await vault.writeText(".hermesmarkdown/trash/2026-10-06T09-43-55-123Z-0/old.md", "x");
    const result = await collectVaultFiles(vault.asHandle(), true);
    expect(paths(result).some((path) => path.includes("trash"))).toBe(false);
    expect(result.folders.some((path) => path.includes("trash"))).toBe(false);
    expect(result.folders).toContain(".hermesmarkdown");
  });

  it("walks wide trees completely", async () => {
    const vault = new MemoryDirectoryHandle("vault");
    for (let i = 0; i < 40; i++) await vault.writeText(`f${i}/sub/n${i}.md`, "x");
    expect((await collectVaultFiles(vault.asHandle(), false)).files).toHaveLength(40);
  });

  it("lists several folders at once", async () => {
    const vault = new MemoryDirectoryHandle("vault");
    for (let i = 0; i < 20; i++) await vault.writeText(`f${i}/n.md`, "x");
    let active = 0;
    let maxActive = 0;
    for (const child of vault.children.values()) {
      if (child.kind !== "directory") continue;
      const list = child.values.bind(child);
      child.values = async function* () {
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        yield* list();
        active--;
      };
    }
    expect((await collectVaultFiles(vault.asHandle(), false)).files).toHaveLength(20);
    expect(maxActive).toBeGreaterThan(1);
  });

  it("reports each folder's notes as they're found, in batches", async () => {
    const vault = await makeVault();
    for (let i = 0; i < 150; i++) await vault.writeText(`big/n${i}.md`, "x");
    const batches: string[][] = [];
    const result = await collectVaultFiles(vault.asHandle(), false, undefined, (files) => {
      batches.push(files.map((f) => f.path));
    });

    expect(batches.flat().sort()).toEqual(paths(result));
    // A folder is never reported as one batch over 100 notes.
    expect(Math.max(...batches.map((b) => b.length))).toBe(100);
    expect(batches.filter((b) => b[0].startsWith("big/")).map((b) => b.length)).toEqual([100, 50]);
  });

  it("reports code and other text files as they're found, apart from the notes", async () => {
    const vault = await makeVault();
    for (let i = 0; i < 120; i++) await vault.writeText(`src/m${i}.ts`, "x");
    const notes: string[] = [];
    const text: string[][] = [];
    const result = await collectVaultFiles(
      vault.asHandle(), false, undefined,
      (files) => notes.push(...files.map((f) => f.path)),
      (files) => text.push(files.map((f) => f.path)),
    );

    expect(text.flat().sort()).toEqual(result.textFiles.map((f) => f.path).sort());
    expect(text.flat()).toContain("notes/app.tsx");
    expect(notes.some((path) => path.endsWith(".ts"))).toBe(false);
    expect(text.filter((b) => b[0].startsWith("src/")).map((b) => b.length)).toEqual([100, 20]);
  });

  it("keeps walking when the callback throws", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await collectVaultFiles((await makeVault()).asHandle(), false, undefined, () => {
      throw new Error("boom");
    });
    expect(paths(result)).toEqual(["a.md", "notes/b.md", "notes/deep/c.md"]);
    warn.mockRestore();
  });

  it("counts unreadable subfolders", async () => {
    const vault = await makeVault();
    const notes = await vault.getDirectoryHandle("notes");
    notes.values = () => ({
      [Symbol.asyncIterator]: () => ({ next: () => Promise.reject(new Error("NotAllowedError")) }),
    }) as any;
    const result = await collectVaultFiles(vault.asHandle(), false);
    expect(result.failedSubdirs).toBe(1);
    expect(paths(result)).toEqual(["a.md"]);
  });

  it("returns what it found when the walk times out", async () => {
    vi.useFakeTimers();
    const vault = await makeVault();
    const notes = await vault.getDirectoryHandle("notes");
    notes.values = () => ({
      [Symbol.asyncIterator]: () => ({ next: () => new Promise(() => {}) }),
    }) as any;
    const pending = collectVaultFiles(vault.asHandle(), false, 1000);
    await vi.advanceTimersByTimeAsync(1000);
    const result = await pending;
    expect(result.timedOut).toBe(true);
    expect(paths(result)).toEqual(["a.md"]);
  });
});

describe("isSecretFile", () => {
  it("matches .env files only", () => {
    expect(isSecretFile(".env")).toBe(true);
    expect(isSecretFile(".env.local")).toBe(true);
    expect(isSecretFile(".ENV")).toBe(true);
    expect(isSecretFile("env.md")).toBe(false);
    expect(isSecretFile(".environment.md")).toBe(false);
  });
});

describe("listDirectoryEntries", () => {
  const names = (entries: any[]) => entries.map((entry) => entry.name);

  it("hides an empty or dotfile-only document folder at the vault root", async () => {
    const vault = new MemoryDirectoryHandle("vault");
    await vault.writeText("a.md", "x");
    await vault.getDirectoryHandle("document", { create: true });
    expect(names(await listDirectoryEntries(vault.asHandle(), vault.asHandle(), false))).toEqual(["a.md"]);

    await vault.writeText("document/.a.md.crswap", "x");
    expect(names(await listDirectoryEntries(vault.asHandle(), vault.asHandle(), true))).toEqual(["a.md"]);
  });

  it("shows a document folder that holds notes or subfolders, or isn't at the root", async () => {
    const vault = new MemoryDirectoryHandle("vault");
    await vault.writeText("document/plan.md", "x");
    expect(names(await listDirectoryEntries(vault.asHandle(), vault.asHandle(), false))).toEqual(["document"]);

    const other = new MemoryDirectoryHandle("vault");
    await (await other.getDirectoryHandle("document", { create: true })).getDirectoryHandle("drafts", { create: true });
    expect(names(await listDirectoryEntries(other.asHandle(), other.asHandle(), false))).toEqual(["document"]);

    const notes = await other.getDirectoryHandle("notes", { create: true });
    await notes.getDirectoryHandle("document", { create: true });
    (other as any).resolve = async (handle: unknown) => (handle === notes ? ["notes"] : null);
    expect(names(await listDirectoryEntries(other.asHandle(), notes.asHandle(), false))).toEqual(["document"]);
  });
});

describe("resolveDirectory", () => {
  it("walks to a folder, the root for \"\", and null for one that's gone", async () => {
    const vault = (await makeVault()).asHandle();
    expect((await resolveDirectory(vault, "notes/deep"))?.name).toBe("deep");
    expect(await resolveDirectory(vault, "")).toBe(vault);
    expect(await resolveDirectory(vault, "notes/missing")).toBeNull();
  });
});

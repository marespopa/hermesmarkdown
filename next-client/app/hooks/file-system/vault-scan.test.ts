import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryDirectoryHandle } from "@/app/services/memory-file-system.test-utils";
import { collectVaultFiles, isSecretFile, listDirectoryEntries } from "./vault-scan";

async function makeVault() {
  const vault = new MemoryDirectoryHandle("vault");
  for (const path of [
    "a.md",
    "notes/b.md",
    "notes/deep/c.md",
    "notes/image.png",
    ".env",
    ".env.local",
    "notes/.env.production",
    ".hermes/index.yaml",
    ".hermes/.env",
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

  it("with hidden files, adds notes in dotfolders and .hermes data but never secrets or .git", async () => {
    const result = await collectVaultFiles((await makeVault()).asHandle(), true);
    expect(paths(result)).toEqual([
      ".hermes/index.yaml",
      ".obsidian/snippets/readme.md",
      "a.md",
      "notes/b.md",
      "notes/deep/c.md",
    ]);
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

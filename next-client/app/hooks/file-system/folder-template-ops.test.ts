import { describe, expect, it, vi } from "vitest";
import { MemoryDirectoryHandle } from "@/app/services/memory-file-system.test-utils";
import type { ScaffoldPlan } from "@/app/utils/templates/folder-template";
import { readScaffoldSource, rollbackScaffold, ScaffoldClashError, writeScaffold } from "./folder-template-ops";

const template = { name: "Launch", folder: "_templates/Launch", readmePath: "_templates/Launch/README.md" };
type OkPlan = Extract<ScaffoldPlan, { ok: true }>;

const planOf = (entries: OkPlan["entries"]): OkPlan => ({ ok: true, topName: "Acme", entries, noteCount: 1 });

describe("readScaffoldSource", () => {
  it("walks nested and empty folders, skips dot entries, reads md as text and the rest as bytes", async () => {
    const vault = new MemoryDirectoryHandle("vault");
    await vault.writeText("_templates/Launch/README.md", "---\nscaffold: true\n---\nHi");
    await vault.writeText("_templates/Launch/Notes/Kickoff.md", "Kick");
    await vault.writeText("_templates/Launch/.hidden.md", "no");
    await vault.writeText("_templates/Launch/.git/config", "no");
    await vault.writeText("_templates/Launch/logo.png", "PNG");
    const empty = await (await vault.getDirectoryHandle("_templates")).getDirectoryHandle("Launch");
    await empty.getDirectoryHandle("Empty", { create: true });

    const source = await readScaffoldSource(vault.asHandle(), template);
    expect(source.name).toBe("Launch");
    expect(source.entries.map((e) => `${e.kind}:${e.path}`)).toEqual([
      "folder:Empty",
      "folder:Notes",
      "file:Notes/Kickoff.md",
      "file:README.md",
      "file:logo.png",
    ]);
    expect(source.entries.find((e) => e.path === "README.md")?.text).toContain("scaffold: true");
    const png = source.entries.find((e) => e.path === "logo.png");
    expect(png?.text).toBeUndefined();
    expect(png?.bytes?.byteLength).toBe(3);
  });
});

describe("writeScaffold", () => {
  it("creates the structure and returns the root README handle", async () => {
    const dest = new MemoryDirectoryHandle("vault");
    const bytes = new Uint8Array([1, 2, 3]).buffer;
    const { rootReadme } = await writeScaffold(dest.asHandle(), planOf([
      { path: "Acme", kind: "folder" },
      { path: "Acme/Notes", kind: "folder" },
      { path: "Acme/Notes/Kickoff.md", kind: "file", content: "Kick" },
      { path: "Acme/README.md", kind: "file", content: "Hi", isRootReadme: true },
      { path: "Acme/logo.png", kind: "file", content: bytes },
      { path: "Acme/Empty", kind: "folder" },
    ]));
    expect(dest.listPaths()).toEqual(["Acme/Notes/Kickoff.md", "Acme/README.md", "Acme/logo.png"]);
    expect(dest.fileAt("Acme/Notes/Kickoff.md")?.text()).toBe("Kick");
    expect(dest.fileAt("Acme/logo.png")?.bytes.byteLength).toBe(3);
    expect(rootReadme?.name).toBe("README.md");
    const acme = await dest.getDirectoryHandle("Acme");
    expect(acme.children.has("Empty")).toBe(true);
  });

  it("never writes a 0-byte note", async () => {
    const dest = new MemoryDirectoryHandle("vault");
    await writeScaffold(dest.asHandle(), planOf([
      { path: "Acme", kind: "folder" },
      { path: "Acme/A.md", kind: "file", content: "" },
    ]));
    expect(dest.fileAt("Acme/A.md")?.text()).toBe("\n");
  });

  it("throws ScaffoldClashError and writes nothing when the top folder isn't empty", async () => {
    const dest = new MemoryDirectoryHandle("vault");
    await dest.writeText("Acme/existing.md", "keep");
    const run = writeScaffold(dest.asHandle(), planOf([
      { path: "Acme", kind: "folder" },
      { path: "Acme/A.md", kind: "file", content: "x" },
    ]));
    await expect(run).rejects.toBeInstanceOf(ScaffoldClashError);
    await expect(run).rejects.toMatchObject({ beforeWrites: true });
    expect(dest.listPaths()).toEqual(["Acme/existing.md"]);
    expect(dest.fileAt("Acme/existing.md")?.text()).toBe("keep");
  });
});

describe("rollbackScaffold", () => {
  it("removes a partly written tree", async () => {
    const dest = new MemoryDirectoryHandle("vault");
    await dest.writeText("Acme/Notes/A.md", "x");
    await dest.writeText("other.md", "keep");
    expect(await rollbackScaffold(dest.asHandle(), "Acme")).toBe(true);
    expect(dest.listPaths()).toEqual(["other.md"]);
  });

  it("returns false when removal throws", async () => {
    const dest = new MemoryDirectoryHandle("vault");
    await dest.writeText("Acme/A.md", "x");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(dest, "removeEntry").mockRejectedValue(new Error("locked"));
    expect(await rollbackScaffold(dest.asHandle(), "Acme")).toBe(false);
  });
});

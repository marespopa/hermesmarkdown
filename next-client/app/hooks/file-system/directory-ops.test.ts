import { describe, expect, it } from "vitest";
import { MemoryDirectoryHandle } from "@/app/services/memory-file-system.test-utils";
import { moveDirectoryByCopy } from "./directory-ops";

async function makeVault() {
  const vault = new MemoryDirectoryHandle("vault");
  await vault.writeText("notes/a.md", "A");
  await vault.writeText("notes/sub/b.md", "B");
  const image = await vault.getDirectoryHandle("notes").then((d) => d.getFileHandle("img.png", { create: true }));
  image.bytes = new Uint8Array([0, 255, 7]);
  await vault.getDirectoryHandle("archive", { create: true });
  return vault;
}

describe("moveDirectoryByCopy", () => {
  it("renames a folder in place, keeping nested files and bytes", async () => {
    const vault = await makeVault();
    const notes = await vault.getDirectoryHandle("notes");

    await moveDirectoryByCopy(notes.asHandle(), vault.asHandle(), vault.asHandle(), "journal");

    expect(vault.listPaths()).toEqual(["journal/a.md", "journal/img.png", "journal/sub/b.md"]);
    expect(Array.from(vault.fileAt("journal/img.png")!.bytes)).toEqual([0, 255, 7]);
  });

  it("moves a folder into another folder", async () => {
    const vault = await makeVault();
    const notes = await vault.getDirectoryHandle("notes");
    const archive = await vault.getDirectoryHandle("archive");

    await moveDirectoryByCopy(notes.asHandle(), vault.asHandle(), archive.asHandle(), "notes");

    expect(vault.listPaths()).toEqual(["archive/notes/a.md", "archive/notes/img.png", "archive/notes/sub/b.md"]);
  });

  it("refuses to merge into an existing folder", async () => {
    const vault = await makeVault();
    const notes = await vault.getDirectoryHandle("notes");

    await expect(
      moveDirectoryByCopy(notes.asHandle(), vault.asHandle(), vault.asHandle(), "archive"),
    ).rejects.toThrow(/already exists/);
    expect(vault.fileAt("notes/a.md")).toBeDefined();
  });

  it("refuses to move a folder into itself", async () => {
    const vault = await makeVault();
    const notes = await vault.getDirectoryHandle("notes");
    const sub = await notes.getDirectoryHandle("sub");
    Object.assign(notes, { resolve: async (h: unknown) => (h === sub ? ["sub"] : null) });

    await expect(
      moveDirectoryByCopy(notes.asHandle(), vault.asHandle(), sub.asHandle(), "notes"),
    ).rejects.toThrow(/into itself/);
  });

  it("removes a partial copy and keeps the source when copying fails", async () => {
    const vault = await makeVault();
    const notes = await vault.getDirectoryHandle("notes");
    const b = vault.fileAt("notes/sub/b.md")!;
    b.getFile = async () => { throw new DOMException("locked", "NotReadableError"); };

    await expect(
      moveDirectoryByCopy(notes.asHandle(), vault.asHandle(), vault.asHandle(), "journal"),
    ).rejects.toThrow();

    expect(vault.children.has("journal")).toBe(false);
    expect(vault.fileAt("notes/a.md")).toBeDefined();
    expect(vault.fileAt("notes/sub/b.md")).toBeDefined();
  });
});

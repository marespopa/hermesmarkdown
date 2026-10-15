import { describe, expect, it, vi } from "vitest";
import { createUniqueFile, ensureVaultFolder, normalizeFolderPath } from "./unique-file";

function notFound() {
  return Object.assign(new Error("missing"), { name: "NotFoundError" });
}

function fakeDir(existingFiles: string[] = [], name = "vault"): any {
  const files = new Set(existingFiles);
  const dirs = new Map<string, any>();
  return {
    name,
    kind: "directory",
    files,
    dirs,
    getFileHandle: vi.fn(async (fileName: string, opts?: { create?: boolean }) => {
      if (files.has(fileName)) return { kind: "file", name: fileName };
      if (!opts?.create) throw notFound();
      files.add(fileName);
      return { kind: "file", name: fileName };
    }),
    getDirectoryHandle: vi.fn(async (dirName: string, opts?: { create?: boolean }) => {
      if (!dirs.has(dirName)) {
        if (!opts?.create) throw notFound();
        dirs.set(dirName, fakeDir([], dirName));
      }
      return dirs.get(dirName);
    }),
  };
}

describe("createUniqueFile", () => {
  it("creates the plain name when it's free", async () => {
    const dir = fakeDir();
    const { fileName } = await createUniqueFile(dir, "Weekly review");
    expect(fileName).toBe("Weekly review.md");
    expect(dir.files.has("Weekly review.md")).toBe(true);
  });

  it("numbers the name instead of overwriting", async () => {
    const dir = fakeDir(["Note.md", "Note (1).md"]);
    const { fileName } = await createUniqueFile(dir, "Note");
    expect(fileName).toBe("Note (2).md");
  });

  it("keeps .board last when numbering a board", async () => {
    const dir = fakeDir(["Untitled.board.md"]);
    expect((await createUniqueFile(dir, "Untitled.board")).fileName).toBe("Untitled (1).board.md");
    expect((await createUniqueFile(dir, "Untitled.board")).fileName).toBe("Untitled (2).board.md");
  });

  it("leaves other names alone", async () => {
    expect((await createUniqueFile(fakeDir(["Notes.md"]), "Notes")).fileName).toBe("Notes (1).md");
    expect((await createUniqueFile(fakeDir(["foo.boardgame.md"]), "foo.boardgame")).fileName).toBe("foo.boardgame (1).md");
  });

  it("rethrows errors other than a missing file", async () => {
    const dir = fakeDir();
    dir.getFileHandle.mockRejectedValue(Object.assign(new Error("denied"), { name: "NotAllowedError" }));
    await expect(createUniqueFile(dir, "Note")).rejects.toThrow("denied");
  });
});

describe("ensureVaultFolder", () => {
  it("returns the vault itself for an empty path", async () => {
    const vault = fakeDir();
    expect(await ensureVaultFolder(vault, "")).toBe(vault);
  });

  it("creates each missing segment", async () => {
    const vault = fakeDir();
    const folder = await ensureVaultFolder(vault, "inbox/daily");
    expect(folder.name).toBe("daily");
    expect(vault.dirs.get("inbox").dirs.get("daily")).toBe(folder);
  });
});

describe("normalizeFolderPath", () => {
  it("trims slashes, spaces and relative segments", () => {
    expect(normalizeFolderPath(" /inbox/ daily /")).toBe("inbox/daily");
    expect(normalizeFolderPath("../../etc")).toBe("etc");
    expect(normalizeFolderPath("a\\b")).toBe("a/b");
    expect(normalizeFolderPath("")).toBe("");
  });
});

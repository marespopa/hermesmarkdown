import { describe, expect, it } from "vitest";
import { unzipSync, zipSync } from "fflate";
import {
  availableFileName,
  collectArchiveFiles,
  copyVaultToDirectory,
  createVaultZipBytes,
  readImportSelection,
  sanitizeArchivePath,
  stripSharedRoot,
  writeArchiveFiles,
} from "./vault-archive";
import { fakeFile, MemoryDirectoryHandle } from "./memory-file-system.test-utils";

const zipBytes = (root: MemoryDirectoryHandle) => createVaultZipBytes(root.asHandle());

describe("sanitizeArchivePath", () => {
  it("normalizes separators and drops empty or dot segments", () => {
    expect(sanitizeArchivePath("notes\\daily//./today.md")).toBe("notes/daily/today.md");
    expect(sanitizeArchivePath("/absolute/note.md")).toBe("absolute/note.md");
  });

  it("rejects traversal, ignored folders, and OS clutter", () => {
    expect(sanitizeArchivePath("../escape.md")).toBeNull();
    expect(sanitizeArchivePath("notes/../../escape.md")).toBeNull();
    expect(sanitizeArchivePath(".git/config")).toBeNull();
    expect(sanitizeArchivePath("__MACOSX/notes/._a.md")).toBeNull();
    expect(sanitizeArchivePath("node_modules/pkg/readme.md")).toBeNull();
    expect(sanitizeArchivePath("notes/.DS_Store")).toBeNull();
    expect(sanitizeArchivePath("")).toBeNull();
  });

  it("keeps hidden vault folders such as .hermes", () => {
    expect(sanitizeArchivePath(".hermes/index.yaml")).toBe(".hermes/index.yaml");
  });
});

describe("stripSharedRoot", () => {
  it("drops a single top-level folder shared by every path", () => {
    expect(stripSharedRoot(["Vault/a.md", "Vault/sub/b.md"])).toEqual(["a.md", "sub/b.md"]);
  });

  it("leaves paths alone when a file sits at the top level or roots differ", () => {
    expect(stripSharedRoot(["Vault/a.md", "b.md"])).toEqual(["Vault/a.md", "b.md"]);
    expect(stripSharedRoot(["One/a.md", "Two/b.md"])).toEqual(["One/a.md", "Two/b.md"]);
  });
});

describe("availableFileName", () => {
  it("adds a counter before the extension until the name is free", async () => {
    const dir = new MemoryDirectoryHandle("vault");
    await dir.writeText("note.md", "a");
    await dir.writeText("note (1).md", "b");
    expect(await availableFileName(dir.asHandle(), "fresh.md")).toBe("fresh.md");
    expect(await availableFileName(dir.asHandle(), "note.md")).toBe("note (2).md");
  });

  it("treats a folder with the same name as taken", async () => {
    const dir = new MemoryDirectoryHandle("vault");
    await dir.getDirectoryHandle("assets", { create: true });
    expect(await availableFileName(dir.asHandle(), "assets")).toBe("assets (1)");
  });
});

describe("collectArchiveFiles", () => {
  it("walks every file, including .hermes, and skips ignored folders", async () => {
    const vault = new MemoryDirectoryHandle("vault");
    await vault.writeText("a.md", "A");
    await vault.writeText("sub/b.md", "B");
    await vault.writeText(".hermes/index.yaml", "x: 1");
    await vault.writeText(".git/HEAD", "ref");
    await vault.writeText("node_modules/pkg/index.js", "");
    await vault.writeText(".DS_Store", "");

    const files = await collectArchiveFiles(vault.asHandle());
    expect(files.map((file) => file.path)).toEqual([".hermes/index.yaml", "a.md", "sub/b.md"]);
  });
});

describe("zip export and import", () => {
  it("round-trips a vault through a zip without overwriting existing files", async () => {
    const source = new MemoryDirectoryHandle("source");
    await source.writeText("a.md", "# A");
    await source.writeText("sub/b.md", "# B");
    await source.writeText(".hermes/index.yaml", "x: 1");
    const bytes = await zipBytes(source);

    const target = new MemoryDirectoryHandle("target");
    await target.writeText("a.md", "existing");

    const files = await readImportSelection([fakeFile("backup.zip", bytes)]);
    const result = await writeArchiveFiles(target.asHandle(), files);

    expect(result).toEqual({ imported: 3, renamed: 1 });
    expect(target.listPaths()).toEqual([".hermes/index.yaml", "a (1).md", "a.md", "sub/b.md"]);
    expect(target.fileAt("a.md")!.text()).toBe("existing");
    expect(target.fileAt("a (1).md")!.text()).toBe("# A");
    expect(target.fileAt("sub/b.md")!.text()).toBe("# B");
  });

  it("strips the wrapping folder of a zipped folder and filters unsafe entries", async () => {
    const bytes = zipSync({
      "My Vault/note.md": new TextEncoder().encode("hi"),
      "My Vault/../evil.md": new TextEncoder().encode("no"),
      "My Vault/.DS_Store": new Uint8Array(),
    });
    const files = await readImportSelection([fakeFile("vault.zip", bytes)]);
    expect(files.map((file) => file.path)).toEqual(["note.md"]);
  });

  it("uses folder-relative paths from a folder selection", async () => {
    const files = await readImportSelection([
      fakeFile("a.md", "A", "Notes/a.md"),
      fakeFile("b.md", "B", "Notes/deep/b.md"),
    ]);
    expect(files.map((file) => file.path)).toEqual(["a.md", "deep/b.md"]);
  });

  it("wraps exported entries in a folder named after the vault", async () => {
    const source = new MemoryDirectoryHandle("My Vault");
    await source.writeText("a.md", "A");
    expect(Object.keys(unzipSync(await zipBytes(source)))).toEqual(["My Vault/a.md"]);
  });

  it("keeps binary attachments byte-for-byte, even when they are the vault's only folder", async () => {
    const source = new MemoryDirectoryHandle("source");
    const image = new Uint8Array([137, 80, 78, 71, 0, 255]);
    const assets = await source.getDirectoryHandle("assets", { create: true });
    (await assets.getFileHandle("pic.png", { create: true })).bytes = image;

    const target = new MemoryDirectoryHandle("target");
    await writeArchiveFiles(target.asHandle(), await readImportSelection([fakeFile("v.zip", await zipBytes(source))]));
    expect(Array.from(target.fileAt("assets/pic.png")!.bytes)).toEqual(Array.from(image));
  });
});

describe("copyVaultToDirectory", () => {
  it("copies into a new folder named after the vault, never into an existing one", async () => {
    const vault = new MemoryDirectoryHandle("vault");
    await vault.writeText("a.md", "A");
    const parent = new MemoryDirectoryHandle("Documents");
    await parent.getDirectoryHandle("Notes", { create: true });

    const result = await copyVaultToDirectory(vault.asHandle(), parent.asHandle(), "Notes");

    expect(result).toEqual({ folder: "Notes (1)", files: 1 });
    expect(parent.listPaths()).toEqual(["Notes (1)/a.md"]);
  });
});

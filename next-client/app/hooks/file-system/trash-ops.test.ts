import { afterEach, describe, expect, it } from "vitest";
import { MemoryDirectoryHandle } from "@/app/services/memory-file-system.test-utils";
import { isTrashSlotExpired, trashSlotDate, trashSlotName } from "@/app/services/vault-trash";
import { relocateEntry, uniqueFolderName } from "./directory-ops";
import { deleteTrashSlot, listTrash, moveToTrash, purgeExpiredTrash, removeEmptyTrashSlot, restoreFromTrash } from "./trash-ops";
import { outermostItems } from "./use-delete-item";
import { CompositeDirectoryHandle, setActiveMountNames } from "@/app/services/library-roots";

const NOW = new Date("2026-10-06T09:43:55.123Z");

describe("relocateEntry", () => {
  it("changes only the letter case through an unused name, leaving no copy", async () => {
    const vault = new MemoryDirectoryHandle("vault");
    await vault.writeText("notes/Draft.md", "x");
    await relocateEntry(vault.asHandle(), "notes/Draft.md", "notes/draft.md");

    const notes = await vault.asHandle().getDirectoryHandle("notes");
    const names: string[] = [];
    for await (const entry of (notes as any).values()) names.push(entry.name);
    expect(names).toEqual(["draft.md"]);
  });

  it("moves a file to another folder, creating it, and renames it on the way", async () => {
    const vault = new MemoryDirectoryHandle("vault");
    await vault.writeText("notes/a.md", "hello");
    await relocateEntry(vault.asHandle(), "notes/a.md", "archive/2026/b.md");
    expect(vault.listPaths()).toEqual(["archive/2026/b.md"]);
    expect(await vault.fileAt("archive/2026/b.md")!.text()).toBe("hello");
  });

  it("moves a folder with everything in it", async () => {
    const vault = new MemoryDirectoryHandle("vault");
    await vault.writeText("notes/deep/a.md", "x");
    await vault.writeText("notes/b.md", "y");
    await relocateEntry(vault.asHandle(), "notes", "archive/notes");
    expect(vault.listPaths()).toEqual(["archive/notes/b.md", "archive/notes/deep/a.md"]);
  });

  it("never overwrites, and refuses to move a folder into itself", async () => {
    const vault = new MemoryDirectoryHandle("vault");
    await vault.writeText("a.md", "mine");
    await vault.writeText("b.md", "theirs");
    await expect(relocateEntry(vault.asHandle(), "a.md", "b.md")).rejects.toThrow("already exists");
    await vault.writeText("notes/c.md", "x");
    await expect(relocateEntry(vault.asHandle(), "notes", "notes/inner")).rejects.toThrow("into itself");
    expect(vault.listPaths()).toEqual(["a.md", "b.md", "notes/c.md"]);
  });
});

describe("uniqueFolderName", () => {
  it("numbers a taken folder name as Finder does", async () => {
    const vault = new MemoryDirectoryHandle("vault");
    expect(await uniqueFolderName(vault.asHandle(), "untitled folder")).toBe("untitled folder");
    await vault.getDirectoryHandle("untitled folder", { create: true });
    await vault.getDirectoryHandle("untitled folder 2", { create: true });
    expect(await uniqueFolderName(vault.asHandle(), "untitled folder")).toBe("untitled folder 3");
  });
});

describe("Trash", () => {
  it("names slots by time and reads the time back", () => {
    const slot = trashSlotName(NOW, 2);
    expect(slot).toBe("2026-10-06T09-43-55-123Z-2");
    expect(trashSlotDate(slot)?.toISOString()).toBe(NOW.toISOString());
    expect(trashSlotDate("my folder")).toBeNull();
    expect(isTrashSlotExpired(slot, new Date("2026-11-04T09:00:00Z"))).toBe(false);
    expect(isTrashSlotExpired(slot, new Date("2026-11-06T09:00:00Z"))).toBe(true);
  });

  it("moves an item into its own slot and puts it back", async () => {
    const vault = new MemoryDirectoryHandle("vault");
    await vault.writeText("notes/a.md", "x");
    const trashPath = await moveToTrash(vault.asHandle(), "notes/a.md", NOW);
    expect(trashPath).toBe(".hermesmarkdown/trash/2026-10-06T09-43-55-123Z-0/a.md");
    expect(vault.listPaths().sort()).toEqual([".hermesmarkdown/trash/2026-10-06T09-43-55-123Z-0/.origin", trashPath]);

    await relocateEntry(vault.asHandle(), trashPath, "notes/a.md");
    await removeEmptyTrashSlot(vault.asHandle(), trashPath);
    expect(vault.listPaths()).toEqual(["notes/a.md"]);
    const trash = await (await vault.getDirectoryHandle(".hermesmarkdown")).getDirectoryHandle("trash");
    expect([...trash.children.keys()]).toEqual([]);
  });

  it("empties only slots past the retention period", async () => {
    const vault = new MemoryDirectoryHandle("vault");
    await vault.writeText("old.md", "x");
    await vault.writeText("new.md", "y");
    await moveToTrash(vault.asHandle(), "old.md", new Date("2026-08-01T00:00:00Z"));
    const kept = await moveToTrash(vault.asHandle(), "new.md", NOW);
    expect(await purgeExpiredTrash(vault.asHandle(), NOW)).toBe(1);
    expect(vault.listPaths().filter((path) => !path.endsWith("/.origin"))).toEqual([kept]);
  });

  it("lists trashed items newest first, with where they came from", async () => {
    const vault = new MemoryDirectoryHandle("vault");
    await vault.writeText("notes/a.md", "x");
    await vault.writeText("drafts/b.md", "y");
    await moveToTrash(vault.asHandle(), "notes/a.md", new Date("2026-10-01T00:00:00Z"));
    await moveToTrash(vault.asHandle(), "drafts", NOW);
    const items = await listTrash(vault.asHandle());
    expect(items.map(({ name, kind, originalPath }) => ({ name, kind, originalPath }))).toEqual([
      { name: "drafts", kind: "directory", originalPath: "drafts" },
      { name: "a.md", kind: "file", originalPath: "notes/a.md" },
    ]);
    expect(items[0].deletedAt?.toISOString()).toBe(NOW.toISOString());
  });

  it("has an empty list before anything is trashed", async () => {
    expect(await listTrash(new MemoryDirectoryHandle("vault").asHandle())).toEqual([]);
  });

  it("puts an item back where it was, making its folder again, and drops the slot", async () => {
    const vault = new MemoryDirectoryHandle("vault");
    await vault.writeText("notes/a.md", "x");
    await moveToTrash(vault.asHandle(), "notes/a.md", NOW);
    const [item] = await listTrash(vault.asHandle());
    expect(await restoreFromTrash(vault.asHandle(), item)).toBe("notes/a.md");
    expect(vault.listPaths()).toEqual(["notes/a.md"]);
    expect(await listTrash(vault.asHandle())).toEqual([]);
  });

  it("won't put an item back over one with its name", async () => {
    const vault = new MemoryDirectoryHandle("vault");
    await vault.writeText("a.md", "old");
    await moveToTrash(vault.asHandle(), "a.md", NOW);
    await vault.writeText("a.md", "new");
    const [item] = await listTrash(vault.asHandle());
    await expect(restoreFromTrash(vault.asHandle(), item)).rejects.toThrow("already exists");
    expect(await vault.fileAt("a.md")!.text()).toBe("new");
  });

  it("deletes a slot for good", async () => {
    const vault = new MemoryDirectoryHandle("vault");
    await vault.writeText("a.md", "x");
    await moveToTrash(vault.asHandle(), "a.md", NOW);
    const [item] = await listTrash(vault.asHandle());
    await deleteTrashSlot(vault.asHandle(), item.slot);
    expect(vault.listPaths()).toEqual([]);
  });

  it("leaves a vault without a Trash alone", async () => {
    const vault = new MemoryDirectoryHandle("vault");
    expect(await purgeExpiredTrash(vault.asHandle(), NOW)).toBe(0);
  });

  it("trashes a folder rather than also the items inside it", () => {
    const items = [{ path: "notes/a.md" }, { path: "notes" }, { path: "notes-old.md" }, { path: "notes" }];
    expect(outermostItems(items).map((item) => item.path)).toEqual(["notes", "notes-old.md"]);
  });
});

describe("a library's Trashes", () => {
  afterEach(() => setActiveMountNames([]));

  async function library() {
    const vault = new MemoryDirectoryHandle("vault");
    await vault.writeText("notes/a.md", "x");
    const work = new MemoryDirectoryHandle("Work");
    await work.writeText("plans/b.md", "y");
    setActiveMountNames(["Work"]);
    const root = new CompositeDirectoryHandle(vault.asHandle(), [{ name: "Work", handle: work.asHandle() }]) as unknown as FileSystemDirectoryHandle;
    return { vault, work, root };
  }

  it("sends a file to the Trash of the folder it was in", async () => {
    const { vault, work, root } = await library();
    const trashPath = await moveToTrash(root, "Work/plans/b.md", NOW);
    expect(trashPath).toBe("Work/.hermesmarkdown/trash/2026-10-06T09-43-55-123Z-0/b.md");
    expect(work.listPaths()).toEqual([
      ".hermesmarkdown/trash/2026-10-06T09-43-55-123Z-0/.origin",
      ".hermesmarkdown/trash/2026-10-06T09-43-55-123Z-0/b.md",
    ]);
    expect(vault.listPaths()).toEqual(["notes/a.md"]);
  });

  it("lists every folder's Trash and puts an item back in its own folder", async () => {
    const { work, root } = await library();
    await moveToTrash(root, "notes/a.md", new Date("2026-10-01T00:00:00Z"));
    await moveToTrash(root, "Work/plans/b.md", NOW);
    const items = await listTrash(root);
    expect(items.map((item) => item.originalPath)).toEqual(["Work/plans/b.md", "notes/a.md"]);
    expect(await restoreFromTrash(root, items[0])).toBe("Work/plans/b.md");
    expect(work.listPaths()).toEqual(["plans/b.md"]);
  });

  it("deletes a slot from the Trash it is in", async () => {
    const { work, root } = await library();
    await moveToTrash(root, "Work/plans/b.md", NOW);
    const [item] = await listTrash(root);
    await deleteTrashSlot(root, item.slot, "Work/.hermesmarkdown/trash");
    expect(work.listPaths()).toEqual([]);
  });

  it("empties old slots in every folder", async () => {
    const { root } = await library();
    await moveToTrash(root, "notes/a.md", new Date("2026-08-01T00:00:00Z"));
    await moveToTrash(root, "Work/plans/b.md", new Date("2026-08-01T00:00:00Z"));
    expect(await purgeExpiredTrash(root, NOW)).toBe(2);
  });

  it("never moves a library folder, nor anything between folders", async () => {
    const { vault, work, root } = await library();
    await expect(relocateEntry(root, "Work", "Moved")).rejects.toThrow("library folder");
    await expect(relocateEntry(root, "Work/plans/b.md", "notes/b.md")).rejects.toThrow("between library folders");
    expect(work.listPaths()).toEqual(["plans/b.md"]);
    expect(vault.listPaths()).toEqual(["notes/a.md"]);
  });
});

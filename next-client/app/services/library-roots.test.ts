import { afterEach, describe, expect, it } from "vitest";
import { MemoryDirectoryHandle } from "./memory-file-system.test-utils";
import {
  CompositeDirectoryHandle,
  chooseMountName,
  isMountRoot,
  mountOf,
  mountPrefix,
  realHandle,
  sameLibraryFolder,
  setActiveMountNames,
  stripMount,
} from "./library-roots";

// resolve() / isSameEntry(), as the browser's folders have them (the shared
// in-memory folders don't).
async function resolveIn(dir: MemoryDirectoryHandle, handle: unknown): Promise<string[] | null> {
  if (handle === dir) return [];
  for (const child of dir.children.values()) {
    if (child === handle) return [child.name];
    if (child instanceof MemoryDirectoryHandle) {
      const inner = await resolveIn(child, handle);
      if (inner) return [child.name, ...inner];
    }
  }
  return null;
}

class ResolvingDirectory extends MemoryDirectoryHandle {
  async isSameEntry(other: unknown): Promise<boolean> {
    return other === this;
  }

  resolve(handle: unknown): Promise<string[] | null> {
    return resolveIn(this, handle);
  }
}

async function library() {
  const vault = new ResolvingDirectory("vault");
  await vault.writeText("notes/a.md", "a");
  const work = new ResolvingDirectory("Work");
  await work.writeText("plans/b.md", "b");
  const composite = new CompositeDirectoryHandle(vault.asHandle(), [{ name: "Work", handle: work.asHandle() }]);
  return { vault, work, composite };
}

async function names(dir: { values(): AsyncIterable<FileSystemHandle> }): Promise<string[]> {
  const found: string[] = [];
  for await (const entry of dir.values()) found.push(entry.name);
  return found;
}

afterEach(() => setActiveMountNames([]));

describe("CompositeDirectoryHandle", () => {
  it("lists the vault's entries, then its added folders", async () => {
    const { composite } = await library();
    expect(await names(composite)).toEqual(["notes", "Work"]);
  });

  it("walks into an added folder by its name, and into the vault otherwise", async () => {
    const { composite, work, vault } = await library();
    expect(await composite.getDirectoryHandle("Work")).toBe(work);
    expect(await composite.getDirectoryHandle("notes")).toBe(vault.children.get("notes"));
  });

  it("hides a vault folder that has an added folder's name", async () => {
    const { vault, composite, work } = await library();
    await vault.getDirectoryHandle("Work", { create: true });
    expect(await names(composite)).toEqual(["notes", "Work"]);
    expect(await composite.getDirectoryHandle("Work")).toBe(work);
  });

  it("keeps a locked folder out of the listing, and walking into it says access is needed", async () => {
    const vault = new ResolvingDirectory("vault");
    const work = new ResolvingDirectory("Work");
    const composite = new CompositeDirectoryHandle(vault.asHandle(), [{ name: "Work", handle: work.asHandle(), locked: true }]);
    expect(await names(composite)).toEqual([]);
    await expect(composite.getDirectoryHandle("Work")).rejects.toMatchObject({ name: "NotAllowedError" });
  });

  it("never removes an added folder", async () => {
    const { composite, work } = await library();
    await expect(composite.removeEntry("Work")).rejects.toMatchObject({ name: "InvalidModificationError" });
    expect(work.listPaths()).toEqual(["plans/b.md"]);
  });

  it("resolves itself, an added folder, something inside one, and the vault's own items", async () => {
    const { composite, work, vault } = await library();
    const plans = work.children.get("plans")!;
    const b = (plans as MemoryDirectoryHandle).children.get("b.md")!;
    expect(await composite.resolve(composite as unknown as FileSystemHandle)).toEqual([]);
    expect(await composite.resolve(work.asHandle())).toEqual(["Work"]);
    expect(await composite.resolve(b as unknown as FileSystemHandle)).toEqual(["Work", "plans", "b.md"]);
    expect(await composite.resolve(vault.children.get("notes") as unknown as FileSystemHandle)).toEqual(["notes"]);
  });

  it("is the same entry as another library of the same vault", async () => {
    const { composite, vault } = await library();
    const rebuilt = new CompositeDirectoryHandle(vault.asHandle(), []);
    expect(await composite.isSameEntry(rebuilt as unknown as FileSystemHandle)).toBe(true);
    expect(await composite.isSameEntry(vault.asHandle())).toBe(true);
  });

  it("unwraps to the vault's own folder for native APIs", async () => {
    const { composite, vault } = await library();
    expect(realHandle(composite as unknown as FileSystemDirectoryHandle)).toBe(vault);
    expect(realHandle(vault.asHandle())).toBe(vault);
  });
});

describe("library paths", () => {
  it("tell which folder a path is in", () => {
    setActiveMountNames(["Work"]);
    expect(mountOf("Work/plans/b.md")).toBe("Work");
    expect(mountOf("notes/a.md")).toBeNull();
    expect(stripMount("Work/.hermesmarkdown/trash")).toBe(".hermesmarkdown/trash");
    expect(mountPrefix("Work/a.md")).toBe("Work/");
    expect(mountPrefix("a.md")).toBe("");
    expect(isMountRoot("Work")).toBe(true);
    expect(isMountRoot("Work/a.md")).toBe(false);
    expect(sameLibraryFolder("Work/a.md", "Work/x/a.md")).toBe(true);
    expect(sameLibraryFolder("Work/a.md", "a.md")).toBe(false);
  });
});

describe("chooseMountName", () => {
  const taken = { primaryName: "vault", topLevelNames: ["notes"], mountNames: ["Work"], skippedDirs: ["node_modules", "vendor"] };

  it("keeps the folder's own name when it's free", () => {
    expect(chooseMountName("Research", taken)).toBe("Research");
  });

  it("numbers a name that clashes, without regard to case", () => {
    expect(chooseMountName("work", taken)).toBe("work (2)");
    expect(chooseMountName("Notes", taken)).toBe("Notes (2)");
    expect(chooseMountName("vault", taken)).toBe("vault (2)");
  });

  it("never takes a name the app treats specially, nor a hidden one", () => {
    expect(chooseMountName("vendor", taken)).toBe("vendor (2)");
    expect(chooseMountName("assets", taken)).toBe("assets (2)");
    expect(chooseMountName(".cache", taken)).toBe("cache");
  });
});

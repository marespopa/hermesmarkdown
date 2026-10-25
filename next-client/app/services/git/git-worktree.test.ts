import { describe, expect, it } from "vitest";
import { MemoryDirectoryHandle } from "../memory-file-system.test-utils";
import { walkWorktree, type WorktreeOptions } from "./git-worktree";

async function walk(files: Record<string, string>, options: Partial<WorktreeOptions> = {}, prepare?: (vault: MemoryDirectoryHandle) => void) {
  const vault = new MemoryDirectoryHandle("vault");
  for (const [path, text] of Object.entries(files)) await vault.writeText(path, text);
  prepare?.(vault);
  const tree = await walkWorktree(vault.asHandle(), {
    tracked: new Set(),
    trackedDirs: new Set(),
    submodules: new Set(),
    exclude: null,
    isCancelled: () => false,
    onListed: () => {},
    ...options,
  });
  return { paths: [...tree.files.keys()].sort(), tree };
}

describe("walkWorktree", () => {
  it("lists dotfiles and nested files", async () => {
    const { paths } = await walk({ "a.md": "", ".obsidian/app.json": "", "notes/b.md": "" });
    expect(paths).toEqual([".obsidian/app.json", "a.md", "notes/b.md"]);
  });

  it("skips tool folders, the Trash, secret files and nested repositories", async () => {
    const { paths, tree } = await walk({
      "a.md": "",
      "node_modules/x.js": "",
      "src/vendor/y.js": "",
      ".git/HEAD": "",
      ".hermesmarkdown/trash/old.md": "",
      ".env": "",
      ".env.local": "",
      "sub/.git/HEAD": "",
      "sub/c.md": "",
    });
    expect(paths).toEqual(["a.md"]);
    expect(tree.nestedDirs).toEqual(["sub"]);
  });

  it("applies the root .gitignore", async () => {
    const { paths } = await walk({ ".gitignore": "*.log\nbuild/\n", "a.md": "", "x.log": "", "build/out.md": "", "notes/y.log": "" });
    expect(paths).toEqual([".gitignore", "a.md"]);
  });

  it("lets a nested .gitignore re-include", async () => {
    const { paths } = await walk({ ".gitignore": "*.log\n", "notes/.gitignore": "!keep.log\n", "notes/keep.log": "", "notes/drop.log": "", "top.log": "" });
    expect(paths).toEqual([".gitignore", "notes/.gitignore", "notes/keep.log"]);
  });

  it("applies .git/info/exclude", async () => {
    const { paths } = await walk({ "a.md": "", "scratch.md": "" }, { exclude: "scratch.md\n" });
    expect(paths).toEqual(["a.md"]);
  });

  it("still returns a tracked file inside an ignored folder", async () => {
    const { paths } = await walk(
      { ".gitignore": "build/\n", "build/kept.md": "", "build/other.md": "" },
      { tracked: new Set(["build/kept.md"]), trackedDirs: new Set(["build"]) },
    );
    expect(paths).toEqual([".gitignore", "build/kept.md"]);
  });

  it("records a folder whose listing throws", async () => {
    const { paths, tree } = await walk({ "a.md": "", "locked/b.md": "" }, {}, (vault) => {
      const locked = vault.children.get("locked") as MemoryDirectoryHandle;
      locked.values = () => {
        throw new Error("denied");
      };
    });
    expect(paths).toEqual(["a.md"]);
    expect(tree.failedDirs).toEqual(["locked"]);
  });
});

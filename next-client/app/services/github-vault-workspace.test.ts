import { describe, expect, it, vi } from "vitest";
import {
  createGitHubVaultManifest,
  getGitHubVaultWorkspaceName,
  isGitHubVaultPathAllowed,
  normalizeGitHubVaultPath,
  readGitHubVaultFiles,
} from "./github-vault-workspace";

type TestFile = {
  kind: "file";
  name: string;
  getFile: () => Promise<{ text: () => Promise<string> }>;
};
type TestDirectory = {
  kind: "directory";
  name: string;
  values: () => AsyncIterable<TestEntry>;
};
type TestEntry = TestFile | TestDirectory;

function file(name: string, content: string): TestFile {
  return {
    kind: "file",
    name,
    getFile: vi.fn().mockResolvedValue({ text: async () => content }),
  };
}

function directory(name: string, entries: TestEntry[]): TestDirectory {
  return {
    kind: "directory",
    name,
    async *values() {
      yield* entries;
    },
  };
}

describe("GitHub vault workspace paths", () => {
  it("allows Markdown files and .hermesmarkdown metadata only", () => {
    expect(isGitHubVaultPathAllowed("notes/today.md")).toBe(true);
    expect(isGitHubVaultPathAllowed(".hermesmarkdown/index.json")).toBe(true);
    expect(isGitHubVaultPathAllowed("images/photo.png")).toBe(false);
  });

  it("rejects traversal and protected Git paths", () => {
    expect(() => normalizeGitHubVaultPath("../note.md")).toThrow("traversal");
    expect(() => normalizeGitHubVaultPath(".git/config")).toThrow("traversal");
    expect(() => normalizeGitHubVaultPath("notes\\note.md")).toThrow("relative");
  });

  it("uses an immutable repository ID and branch-specific workspace", () => {
    expect(getGitHubVaultWorkspaceName({ repositoryId: 42, branch: "feature/notes" }))
      .toBe("42-feature%2Fnotes");
  });

  it("creates a manifest without remote identities until materialization", () => {
    expect(createGitHubVaultManifest("abc123")).toEqual({
      version: 1,
      baseHeadSha: "abc123",
      entries: {},
      pendingSyncOperationId: null,
    });
  });

  it("skips dependency directories while reading files for GitHub sync", async () => {
    const ignoredFile = file("package.md", "should not be read");
    const workspace = directory("vault", [
      file("note.md", "vault note"),
      directory("node_modules", [ignoredFile]),
      directory("vendor", [file("dependency.md", "should not be read")]),
      directory(".hermesmarkdown", [file("metadata.json", "{}")]),
    ]);

    await expect(readGitHubVaultFiles(workspace)).resolves.toEqual([
      { path: ".hermesmarkdown/metadata.json", content: "{}" },
      { path: "note.md", content: "vault note" },
    ]);
    expect(ignoredFile.getFile).not.toHaveBeenCalled();
  });
});

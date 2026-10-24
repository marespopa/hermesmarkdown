// @vitest-environment node
import { describe, expect, it } from "vitest";
import { compileFilesFilter, filterVault } from "./files-filter";

const files = ["projects/roadmap.md", "projects/launch/plan.md", "notes/release.md", "inbox.md"].map((path) => ({ path }));
const folders = ["projects", "projects/launch", "notes", "archive"];
const run = (query: string) => filterVault(files, folders, compileFilesFilter(query)!, (file) => file.path);

describe("files filter", () => {
  it("shows everything for an empty query", () => {
    expect(compileFilesFilter("  ")).toBeNull();
  });

  it("matches paths by regular expression, ignoring case", () => {
    const result = run("^projects/.*PLAN");
    expect(result.files.map((file) => file.path)).toEqual(["projects/launch/plan.md"]);
    expect(result.folderPaths).toEqual(["projects", "projects/launch"]);
  });

  it("keeps folders whose own path matches", () => {
    expect(run("arch").folderPaths).toEqual(["archive"]);
    expect(run("arch").files).toEqual([]);
  });

  it("matches an invalid pattern as plain text, and says so", () => {
    const filter = compileFilesFilter("release(")!;
    expect(filter.valid).toBe(false);
    expect(filter.test("notes/release(1).md")).toBe(true);
    expect(filter.test("notes/release.md")).toBe(false);
    expect(compileFilesFilter("rel")!.valid).toBe(true);
  });
});

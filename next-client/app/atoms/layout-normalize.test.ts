// @vitest-environment node
import { describe, it, expect } from "vitest";
import { WORKSPACE_LAYOUT_VERSION } from "@/app/types/workspace";
import { normalizeWorkspaceLayout } from "./layout-normalize";

const leaf = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  openFilePaths: [],
  isPinned: false,
  ...extra,
});

const split = (children: unknown[], extra: Record<string, unknown> = {}) => ({
  id: "c1",
  direction: "horizontal",
  sizes: [50, 50],
  children,
  ...extra,
});

describe("normalizeWorkspaceLayout", () => {
  it("stamps the current version and drops a legacy pane type", () => {
    const result = normalizeWorkspaceLayout({ rootContainer: leaf("a", { type: "preview", openFilePaths: ["a.md"] }) });
    expect(result?.version).toBe(WORKSPACE_LAYOUT_VERSION);
    expect(result?.rootContainer).toEqual({ id: "a", openFilePaths: ["a.md"], isPinned: false });
  });

  it("merges a legacy split layout into its first pane", () => {
    const result = normalizeWorkspaceLayout({
      version: 2,
      rootContainer: split([
        leaf("a", { openFilePaths: ["a.md", "b.md"], activeFilePath: "b.md" }),
        split([leaf("b", { type: "preview", openFilePaths: ["b.md", "c.md"], activeFilePath: "c.md" })], { scrollLock: true }),
      ]),
    });
    expect(result?.rootContainer).toEqual({
      id: "a",
      openFilePaths: ["a.md", "b.md", "c.md"],
      activeFilePath: "b.md",
      isPinned: false,
    });
  });

  it("takes the next pane's front note when the first has none", () => {
    const result = normalizeWorkspaceLayout({
      version: 2,
      rootContainer: split([leaf("a"), leaf("b", { openFilePaths: ["b.md"], activeFilePath: "b.md" })]),
    });
    expect(result?.rootContainer).toMatchObject({ id: "a", openFilePaths: ["b.md"], activeFilePath: "b.md" });
  });

  it("merges recently viewed notes, keeping each one's latest position", () => {
    const result = normalizeWorkspaceLayout({
      version: 2,
      rootContainer: split([
        leaf("a", { openFilePaths: ["a.md", "b.md"], recentFilePaths: ["b.md", "a.md"] }),
        leaf("b", { openFilePaths: ["b.md"], recentFilePaths: ["b.md"] }),
      ]),
    });
    expect(result?.rootContainer.recentFilePaths).toEqual(["a.md", "b.md"]);
  });

  it("defaults missing openFilePaths and isPinned", () => {
    const result = normalizeWorkspaceLayout({ version: 2, rootContainer: { id: "a", type: "weird" } });
    expect(result?.rootContainer).toEqual({ id: "a", openFilePaths: [], isPinned: false });
  });

  it("returns null for garbage", () => {
    expect(normalizeWorkspaceLayout(null)).toBeNull();
    expect(normalizeWorkspaceLayout("x")).toBeNull();
    expect(normalizeWorkspaceLayout({})).toBeNull();
    expect(normalizeWorkspaceLayout({ rootContainer: split([]) })).toBeNull();
  });
});

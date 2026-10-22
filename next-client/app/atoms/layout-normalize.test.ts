// @vitest-environment node
import { describe, it, expect } from "vitest";
import { normalizeWorkspaceLayout } from "./layout-normalize";

const leaf = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  type: "editor",
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
  it("turns a legacy preview leaf into an editor when there is no version", () => {
    const result = normalizeWorkspaceLayout({ rootContainer: leaf("a", { type: "preview" }) });
    expect(result?.version).toBe(2);
    expect(result?.rootContainer).toMatchObject({ type: "editor" });
  });

  it("keeps a preview leaf in a v2 layout", () => {
    const result = normalizeWorkspaceLayout({ version: 2, rootContainer: leaf("a", { type: "preview" }) });
    expect(result?.rootContainer).toMatchObject({ type: "preview" });
  });

  it("replaces bad sizes with equal shares", () => {
    for (const sizes of [[Number.NaN, 1], [10, 20, 70], [0, 0]]) {
      const result = normalizeWorkspaceLayout({ version: 2, rootContainer: split([leaf("a"), leaf("b")], { sizes }) });
      expect((result?.rootContainer as { sizes: number[] }).sizes).toEqual([50, 50]);
    }
  });

  it("rescales sizes that do not sum to 100", () => {
    const result = normalizeWorkspaceLayout({ version: 2, rootContainer: split([leaf("a"), leaf("b")], { sizes: [30, 30] }) });
    expect((result?.rootContainer as { sizes: number[] }).sizes).toEqual([50, 50]);
  });

  it("keeps valid sizes untouched", () => {
    const result = normalizeWorkspaceLayout({ version: 2, rootContainer: split([leaf("a"), leaf("b")], { sizes: [70, 30] }) });
    expect((result?.rootContainer as { sizes: number[] }).sizes).toEqual([70, 30]);
  });

  it("collapses a one-child container and drops an empty one", () => {
    const one = normalizeWorkspaceLayout({ version: 2, rootContainer: split([leaf("a")]) });
    expect(one?.rootContainer).toMatchObject({ id: "a" });
    const mixed = normalizeWorkspaceLayout({
      version: 2,
      rootContainer: split([split([]), leaf("a"), null]),
    });
    expect(mixed?.rootContainer).toMatchObject({ id: "a" });
  });

  it("defaults missing openFilePaths and unknown types", () => {
    const result = normalizeWorkspaceLayout({
      version: 2,
      rootContainer: { id: "a", type: "weird" },
    });
    expect(result?.rootContainer).toMatchObject({ type: "editor", openFilePaths: [], isPinned: false });
  });

  it("removes a non-boolean scrollLock and keeps a boolean one", () => {
    const bad = normalizeWorkspaceLayout({ version: 2, rootContainer: split([leaf("a"), leaf("b")], { scrollLock: "yes" }) });
    expect(bad?.rootContainer).not.toHaveProperty("scrollLock");
    const good = normalizeWorkspaceLayout({ version: 2, rootContainer: split([leaf("a"), leaf("b")], { scrollLock: true }) });
    expect(good?.rootContainer).toMatchObject({ scrollLock: true });
  });

  it("returns null for garbage", () => {
    expect(normalizeWorkspaceLayout(null)).toBeNull();
    expect(normalizeWorkspaceLayout("x")).toBeNull();
    expect(normalizeWorkspaceLayout({})).toBeNull();
    expect(normalizeWorkspaceLayout({ rootContainer: split([]) })).toBeNull();
  });
});

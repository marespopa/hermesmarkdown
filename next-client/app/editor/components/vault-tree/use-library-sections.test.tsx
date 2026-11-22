import React from "react";
import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { afterEach, describe, expect, it } from "vitest";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_fileTreeExpansion } from "@/app/atoms/ui-atoms";
import { CompositeDirectoryHandle } from "@/app/services/library-roots";
import { useFolderExpansion } from "./use-folder-expansion";
import { useLibrarySections } from "./use-library-sections";
import type { VisibleRow } from "./tree-model";

const dir = (name: string) => ({ name, kind: "directory" }) as unknown as FileSystemDirectoryHandle;
const row = (path: string): VisibleRow => ({ path, type: "file", depth: 0, node: { type: "file", name: path, path, entry: {} } });
const rows = [row("top.md"), row("Work"), row("Work/b.md")];

function setup(withFolder = true) {
  const store = createStore();
  // Remembered expansion is kept in localStorage: each test starts afresh.
  store.set(atom_fileTreeExpansion, {});
  const vault = dir("Notes");
  store.set(atom_vaultHandle, withFolder
    ? new CompositeDirectoryHandle(vault, [{ name: "Work", handle: dir("Work") }]) as unknown as FileSystemDirectoryHandle
    : vault);
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  return renderHook(({ expandAll }) => {
    const expansion = useFolderExpansion(new Set());
    return useLibrarySections([], expansion, expandAll);
  }, { wrapper, initialProps: { expandAll: false } });
}

describe("useLibrarySections", () => {
  afterEach(() => createStore().set(atom_vaultHandle, null));

  it("starts with the vault's section open, and folds its rows away when collapsed", () => {
    const { result } = setup();
    expect(result.current.vaultSection).toBe("Notes");
    expect(result.current.vaultCollapsed).toBe(false);
    act(() => result.current.sectionProps.onToggleVault());
    expect(result.current.vaultCollapsed).toBe(true);
    expect(result.current.visibleRows(rows).map((r) => r.path)).toEqual(["Work", "Work/b.md"]);
  });

  it("opens the section again for a vault path, not for one in an added folder", () => {
    const { result } = setup();
    act(() => result.current.sectionProps.onToggleVault());
    act(() => result.current.openVaultFor("Work/plans"));
    expect(result.current.vaultCollapsed).toBe(true);
    act(() => result.current.openVaultFor(""));
    expect(result.current.vaultCollapsed).toBe(false);
  });

  it("shows everything while a filter opens every folder", () => {
    const { result, rerender } = setup();
    act(() => result.current.sectionProps.onToggleVault());
    rerender({ expandAll: true });
    expect(result.current.vaultCollapsed).toBe(false);
    expect(result.current.visibleRows(rows)).toHaveLength(3);
  });

  it("has no section for a plain vault", () => {
    const { result } = setup(false);
    expect(result.current.vaultSection).toBeNull();
    expect(result.current.visibleRows(rows)).toHaveLength(3);
  });
});

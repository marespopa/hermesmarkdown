import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryDirectoryHandle } from "@/app/services/memory-file-system.test-utils";
import { useVaultHasGit } from "./use-vault-has-git";

const asHandle = (dir: MemoryDirectoryHandle) => dir as unknown as FileSystemDirectoryHandle;

describe("useVaultHasGit", () => {
  it("is null without a vault", () => {
    const { result } = renderHook(() => useVaultHasGit(null));
    expect(result.current).toBeNull();
  });

  it("finds a .git folder at the vault's root", async () => {
    const vault = new MemoryDirectoryHandle("vault");
    await vault.getDirectoryHandle(".git", { create: true });
    const { result } = renderHook(() => useVaultHasGit(asHandle(vault)));
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("is false without one, and checks again when the window regains focus", async () => {
    const vault = new MemoryDirectoryHandle("vault");
    const { result } = renderHook(() => useVaultHasGit(asHandle(vault)));
    await waitFor(() => expect(result.current).toBe(false));

    await vault.getDirectoryHandle(".git", { create: true });
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    await waitFor(() => expect(result.current).toBe(true));
  });
});

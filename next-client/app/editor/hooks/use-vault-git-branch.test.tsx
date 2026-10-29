import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  openRepo: vi.fn(),
  readBranchName: vi.fn(),
}));

vi.mock("@/app/services/git/git-repo", () => ({ openRepo: mocks.openRepo }));
vi.mock("@/app/services/git/git-refs", () => ({ readBranchName: mocks.readBranchName }));

import { useVaultGitBranch } from "./use-vault-git-branch";

const vault = {} as FileSystemDirectoryHandle;
const gitDir = {} as FileSystemDirectoryHandle;

describe("useVaultGitBranch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads a named branch and refreshes it when the window regains focus", async () => {
    mocks.openRepo.mockResolvedValue({ gitDir });
    mocks.readBranchName.mockResolvedValueOnce("main").mockResolvedValueOnce("release");
    const { result } = renderHook(() => useVaultGitBranch(vault));

    await waitFor(() => expect(result.current).toBe("main"));
    act(() => window.dispatchEvent(new Event("focus")));
    await waitFor(() => expect(result.current).toBe("release"));
  });

  it("hides the label when the vault has no usable Git repository", async () => {
    mocks.openRepo.mockResolvedValue(null);
    const { result } = renderHook(() => useVaultGitBranch(vault));
    await waitFor(() => expect(mocks.openRepo).toHaveBeenCalledWith(vault));
    await waitFor(() => expect(result.current).toBeNull());
    expect(mocks.readBranchName).not.toHaveBeenCalled();
  });
});

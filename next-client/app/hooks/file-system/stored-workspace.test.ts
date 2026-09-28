import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadStoredWorkspace } from "./stored-workspace";

const {
  loadBrowserVaultDescriptor,
  loadGitHubVaultDescriptor,
  getBrowserVaultWorkspace,
  getGitHubVaultWorkspace,
} = vi.hoisted(() => ({
  loadBrowserVaultDescriptor: vi.fn(),
  loadGitHubVaultDescriptor: vi.fn(),
  getBrowserVaultWorkspace: vi.fn(),
  getGitHubVaultWorkspace: vi.fn(),
}));

vi.mock("@/app/services/idb", () => ({ loadBrowserVaultDescriptor, loadGitHubVaultDescriptor }));
vi.mock("@/app/services/opfs", () => ({ getBrowserVaultWorkspace }));
vi.mock("@/app/services/github-vault-workspace", () => ({ getGitHubVaultWorkspace }));

const browserDescriptor = { version: 1, kind: "browser", id: "abc", displayName: "Notes", createdAt: 1 };
const githubDescriptor = {
  version: 1,
  kind: "github",
  repositoryId: 7,
  owner: "someone",
  repository: "notes",
  branch: "main",
  displayName: "someone/notes",
  baseHeadSha: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  getBrowserVaultWorkspace.mockResolvedValue({ name: "browser-abc" });
  getGitHubVaultWorkspace.mockResolvedValue({ name: "7-main" });
});

describe("loadStoredWorkspace", () => {
  it("reopens the saved browser vault", async () => {
    loadBrowserVaultDescriptor.mockResolvedValue(browserDescriptor);

    const stored = await loadStoredWorkspace();

    expect(stored).toEqual({ handle: { name: "browser-abc" }, descriptor: browserDescriptor });
    expect(getBrowserVaultWorkspace).toHaveBeenCalledWith(browserDescriptor);
    expect(loadGitHubVaultDescriptor).not.toHaveBeenCalled();
  });

  it("falls back to the saved GitHub vault", async () => {
    loadBrowserVaultDescriptor.mockResolvedValue(null);
    loadGitHubVaultDescriptor.mockResolvedValue(githubDescriptor);

    const stored = await loadStoredWorkspace();

    expect(stored).toEqual({ handle: { name: "7-main" }, descriptor: githubDescriptor });
    expect(getBrowserVaultWorkspace).not.toHaveBeenCalled();
  });

  it("returns null when no browser-storage vault was saved", async () => {
    loadBrowserVaultDescriptor.mockResolvedValue(null);
    loadGitHubVaultDescriptor.mockResolvedValue(null);

    await expect(loadStoredWorkspace()).resolves.toBeNull();
  });
});

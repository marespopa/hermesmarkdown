// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadStoredWorkspace } from "./stored-workspace";

const { loadBrowserVaultDescriptor, getBrowserVaultWorkspace } = vi.hoisted(() => ({
  loadBrowserVaultDescriptor: vi.fn(),
  getBrowserVaultWorkspace: vi.fn(),
}));

vi.mock("@/app/services/idb", () => ({ loadBrowserVaultDescriptor }));
vi.mock("@/app/services/opfs", () => ({ getBrowserVaultWorkspace }));

const browserDescriptor = { version: 1, kind: "browser", id: "abc", displayName: "Notes", createdAt: 1 };

beforeEach(() => {
  vi.clearAllMocks();
  getBrowserVaultWorkspace.mockResolvedValue({ name: "browser-abc" });
});

describe("loadStoredWorkspace", () => {
  it("reopens the saved browser vault", async () => {
    loadBrowserVaultDescriptor.mockResolvedValue(browserDescriptor);

    const stored = await loadStoredWorkspace();

    expect(stored).toEqual({ handle: { name: "browser-abc" }, descriptor: browserDescriptor });
    expect(getBrowserVaultWorkspace).toHaveBeenCalledWith(browserDescriptor);
  });

  it("returns null when no browser vault was saved", async () => {
    loadBrowserVaultDescriptor.mockResolvedValue(null);

    await expect(loadStoredWorkspace()).resolves.toBeNull();
    expect(getBrowserVaultWorkspace).not.toHaveBeenCalled();
  });
});

import { describe, expect, it } from "vitest";
import {
  createBrowserVaultDescriptor,
  formatBytes,
  isBrowserVaultBackupDue,
  isBrowserVaultDescriptor,
  isBrowserVaultId,
} from "./opfs";

const DAY = 24 * 60 * 60 * 1000;

describe("browser vault descriptors", () => {
  it("creates a valid descriptor with a trimmed name and a safe id", () => {
    const descriptor = createBrowserVaultDescriptor("  My Notes  ");
    expect(descriptor.displayName).toBe("My Notes");
    expect(isBrowserVaultId(descriptor.id)).toBe(true);
    expect(isBrowserVaultDescriptor(descriptor)).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(() => createBrowserVaultDescriptor("   ")).toThrow("A vault name is required.");
  });

  it("validates stored descriptors", () => {
    const valid = { version: 1, kind: "browser", id: "abc-123", displayName: "Notes", createdAt: 1 };
    expect(isBrowserVaultDescriptor(valid)).toBe(true);
    expect(isBrowserVaultDescriptor({ ...valid, lastExportedAt: 5 })).toBe(true);
    expect(isBrowserVaultDescriptor({ ...valid, id: "../escape" })).toBe(false);
    expect(isBrowserVaultDescriptor({ ...valid, kind: "github" })).toBe(false);
    expect(isBrowserVaultDescriptor({ ...valid, lastExportedAt: "yesterday" })).toBe(false);
    expect(isBrowserVaultDescriptor(null)).toBe(false);
  });
});

describe("isBrowserVaultBackupDue", () => {
  const base = { version: 1 as const, kind: "browser" as const, id: "a", displayName: "A", createdAt: 0 };

  it("is due two weeks after creation when never exported", () => {
    expect(isBrowserVaultBackupDue(base, 13 * DAY)).toBe(false);
    expect(isBrowserVaultBackupDue(base, 15 * DAY)).toBe(true);
  });

  it("counts from the last export when there is one", () => {
    expect(isBrowserVaultBackupDue({ ...base, lastExportedAt: 10 * DAY }, 20 * DAY)).toBe(false);
    expect(isBrowserVaultBackupDue({ ...base, lastExportedAt: 10 * DAY }, 25 * DAY)).toBe(true);
  });
});

describe("formatBytes", () => {
  it("formats sizes for the storage readout", () => {
    expect(formatBytes(null)).toBe("—");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(50 * 1024 * 1024)).toBe("50 MB");
  });
});

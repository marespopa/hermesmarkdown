import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getDefaultStore } from "jotai";
import { atom_recoveryIssue, clearRecoveryIssue, isQuotaError, reportRecoveryIssue } from "./recovery-atoms";
import { debouncedJSONStorage } from "./file-atoms";

const store = getDefaultStore();

describe("recovery issues", () => {
  beforeEach(() => store.set(atom_recoveryIssue, null));

  it("records a reported issue", () => {
    reportRecoveryIssue({ kind: "storage-full" });
    expect(store.get(atom_recoveryIssue)).toEqual({ kind: "storage-full" });
  });

  it("keeps a vault issue over a later storage one", () => {
    reportRecoveryIssue({ kind: "vault-missing" });
    reportRecoveryIssue({ kind: "storage-full" });
    expect(store.get(atom_recoveryIssue)).toEqual({ kind: "vault-missing" });
  });

  it("lets a more serious issue replace a storage warning", () => {
    reportRecoveryIssue({ kind: "storage-low", usage: 95, quota: 100 });
    reportRecoveryIssue({ kind: "access-lost" });
    expect(store.get(atom_recoveryIssue)).toEqual({ kind: "access-lost" });
  });

  it("clears only the kinds asked for", () => {
    reportRecoveryIssue({ kind: "access-lost" });
    clearRecoveryIssue("storage-full");
    expect(store.get(atom_recoveryIssue)).toEqual({ kind: "access-lost" });
    clearRecoveryIssue("access-lost", "vault-missing");
    expect(store.get(atom_recoveryIssue)).toBeNull();
  });

  it("recognises quota errors from Chromium and Firefox", () => {
    expect(isQuotaError(new DOMException("full", "QuotaExceededError"))).toBe(true);
    expect(isQuotaError({ name: "NS_ERROR_DOM_QUOTA_REACHED" })).toBe(true);
    expect(isQuotaError(new DOMException("gone", "NotFoundError"))).toBe(false);
    expect(isQuotaError(null)).toBe(false);
  });
});

describe("open-note storage running out of room", () => {
  beforeEach(() => {
    store.set(atom_recoveryIssue, null);
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("reports a full localStorage instead of throwing, and clears once a write succeeds", () => {
    const storage = debouncedJSONStorage<{ text: string }>(10);
    // The test setup's localStorage is a mock; fail its next write only.
    vi.mocked(window.localStorage.setItem).mockImplementationOnce(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    storage.setItem("openFiles", { text: "a" });
    expect(() => vi.advanceTimersByTime(10)).not.toThrow();
    expect(store.get(atom_recoveryIssue)).toEqual({ kind: "storage-full" });

    storage.setItem("openFiles", { text: "b" });
    vi.advanceTimersByTime(10);
    expect(store.get(atom_recoveryIssue)).toBeNull();
  });
});

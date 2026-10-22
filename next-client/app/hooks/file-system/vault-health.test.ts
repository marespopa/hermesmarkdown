import { describe, it, expect, beforeEach, vi } from "vitest";
import { getDefaultStore } from "jotai";
import { atom_recoveryIssue } from "@/app/atoms/recovery-atoms";
import { checkVaultHealth, probeVault } from "./vault-health";

const store = getDefaultStore();

function vault({ permission = "granted", listError }: { permission?: string; listError?: string } = {}) {
  return {
    queryPermission: vi.fn(async () => permission),
    values: vi.fn(() => ({
      next: listError ? vi.fn(async () => { throw new DOMException("x", listError); }) : vi.fn(async () => ({ done: true })),
    })),
  } as unknown as FileSystemDirectoryHandle;
}

describe("probeVault", () => {
  it("reads a listable, writable folder as ok", async () => {
    expect(await probeVault(vault())).toBe("ok");
  });

  it("reports lost access when write permission isn't granted", async () => {
    expect(await probeVault(vault({ permission: "prompt" }))).toBe("access-lost");
  });

  it("reports a deleted or moved folder as missing", async () => {
    expect(await probeVault(vault({ listError: "NotFoundError" }))).toBe("vault-missing");
  });

  it("reports a refused listing as lost access", async () => {
    expect(await probeVault(vault({ listError: "NotAllowedError" }))).toBe("access-lost");
  });

  it("treats a browser-storage folder (no queryPermission) by its listing alone", async () => {
    const handle = { values: () => ({ next: async () => ({ done: true }) }) } as unknown as FileSystemDirectoryHandle;
    expect(await probeVault(handle)).toBe("ok");
  });
});

describe("checkVaultHealth", () => {
  beforeEach(() => store.set(atom_recoveryIssue, null));

  it("shows the banner for a missing vault and clears it once the folder is back", async () => {
    await checkVaultHealth(vault({ listError: "NotFoundError" }));
    expect(store.get(atom_recoveryIssue)).toEqual({ kind: "vault-missing" });
    await checkVaultHealth(vault());
    expect(store.get(atom_recoveryIssue)).toBeNull();
  });

  it("leaves a storage issue alone when the vault is fine", async () => {
    store.set(atom_recoveryIssue, { kind: "storage-full" });
    await checkVaultHealth(vault());
    expect(store.get(atom_recoveryIssue)).toEqual({ kind: "storage-full" });
  });
});

import { clearRecoveryIssue, reportRecoveryIssue } from "@/app/atoms/recovery-atoms";

// Whether the open vault folder can still be written: the browser may have
// taken back permission, or the folder may have been deleted or moved
// outside Hermes. Browser-storage vaults have no
// queryPermission and can't go missing this way, so they read as "ok" unless
// listing them fails.
export type VaultHealth = "ok" | "access-lost" | "vault-missing";

export async function probeVault(handle: FileSystemDirectoryHandle): Promise<VaultHealth> {
  try {
    const query = (handle as any).queryPermission;
    if (typeof query === "function") {
      const state = await query.call(handle, { mode: "readwrite" });
      if (state !== "granted") return "access-lost";
    }
    // Listing a folder that no longer exists rejects with NotFoundError.
    await (handle as any).values().next();
    return "ok";
  } catch (err: any) {
    if (err?.name === "NotFoundError") return "vault-missing";
    if (err?.name === "NotAllowedError" || err?.name === "SecurityError") return "access-lost";
    return "ok";
  }
}

// Shows (or clears) the RecoveryBanner for a probe result.
export function applyVaultHealth(health: VaultHealth): void {
  if (health === "ok") clearRecoveryIssue("access-lost", "vault-missing");
  else reportRecoveryIssue({ kind: health });
}

export async function checkVaultHealth(handle: FileSystemDirectoryHandle): Promise<VaultHealth> {
  const health = await probeVault(handle);
  applyVaultHealth(health);
  return health;
}

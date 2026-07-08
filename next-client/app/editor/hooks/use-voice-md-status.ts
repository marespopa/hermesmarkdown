"use client";

import { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_isDriveVault, atom_driveVaultId } from "@/app/atoms/drive-atoms";
import { loadVoiceContext } from "@/app/services/ai";
import { readDriveHermesFile } from "@/app/services/vault-schema";

/**
 * Whether `.hermes/voice.md` exists in the current vault. `null` while
 * unknown (no vault open, or the check hasn't resolved yet) — callers that
 * need a fixed label should treat `null` the same as "doesn't exist yet".
 */
export function useVoiceMdStatus(): boolean | null {
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const isDriveVault = useAtomValue(atom_isDriveVault);
  const driveVaultId = useAtomValue(atom_driveVaultId);
  const [exists, setExists] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const hasVault = vaultHandle || (isDriveVault && driveVaultId);
    if (!hasVault) {
      setExists(null);
      return;
    }
    (async () => {
      const content =
        isDriveVault && driveVaultId
          ? await readDriveHermesFile(driveVaultId, "voice.md")
          : await loadVoiceContext(vaultHandle);
      if (!cancelled) setExists(!!content);
    })();
    return () => {
      cancelled = true;
    };
  }, [vaultHandle, isDriveVault, driveVaultId]);

  return exists;
}

"use client";

import { useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { atom_pinsVaultKey } from "@/app/atoms/pin-atoms";
import { atom_vaultKey } from "@/app/atoms/vault-atoms";

// Shows the open vault's pins (kept on this device, atom_pinsByVault): none
// while the vault is locked or closed.
export function useVaultPins(enabled: boolean): void {
  const vaultKey = useAtomValue(atom_vaultKey);
  const setPinsVaultKey = useSetAtom(atom_pinsVaultKey);
  useEffect(() => {
    setPinsVaultKey(enabled ? vaultKey : null);
  }, [enabled, vaultKey, setPinsVaultKey]);
}

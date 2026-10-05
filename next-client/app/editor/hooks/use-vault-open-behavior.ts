import { useEffect } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { atom_isVaultRestoring, atom_vaultHandle, atom_vaultKey } from "@/app/atoms/vault-atoms";
import { atom_homeFeedOpen, atom_onVaultOpen, atom_vaultOpenBehaviorAppliedFor } from "@/app/atoms/ui-atoms";

// Stands in for a vault key when no vault is open.
export const NO_VAULT_KEY = "no-vault";

// Applies Settings → "On vault open" once per vault per tab session: with
// "home", the home feed opens while the restored tabs stay open behind it.
// With no vault (once the saved vault has had its chance to restore), the
// feed opens too, as the place to open a vault or start writing. Returning
// to the editor from another route (Explorer, Settings) or refreshing the
// page doesn't re-run it, so a refresh stays on the note.
export function useVaultOpenBehavior() {
  const vaultKey = useAtomValue(atom_vaultKey);
  const hasVault = !!useAtomValue(atom_vaultHandle);
  const isVaultRestoring = useAtomValue(atom_isVaultRestoring);
  const behavior = useAtomValue(atom_onVaultOpen);
  const [appliedFor, setAppliedFor] = useAtom(atom_vaultOpenBehaviorAppliedFor);
  const setHomeFeedOpen = useSetAtom(atom_homeFeedOpen);

  useEffect(() => {
    if (!hasVault) {
      if (isVaultRestoring || appliedFor === NO_VAULT_KEY) return;
      setAppliedFor(NO_VAULT_KEY);
      setHomeFeedOpen(true);
      return;
    }
    if (!vaultKey || appliedFor === vaultKey) return;
    setAppliedFor(vaultKey);
    if (behavior === "home") setHomeFeedOpen(true);
  }, [hasVault, isVaultRestoring, vaultKey, appliedFor, behavior, setAppliedFor, setHomeFeedOpen]);
}

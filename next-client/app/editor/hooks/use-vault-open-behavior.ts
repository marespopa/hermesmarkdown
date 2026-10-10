import { useEffect } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { atom_isVaultRestoring, atom_vaultHandle, atom_vaultKey } from "@/app/atoms/vault-atoms";
import { atom_homeFeedOpen, atom_resumeRequested, atom_vaultOpenBehaviorAppliedFor } from "@/app/atoms/ui-atoms";

// Stands in for a vault key when no vault is open.
export const NO_VAULT_KEY = "no-vault";

// Opens the home feed once per vault per tab session; the restored tabs stay
// open behind it. With no vault (once the saved vault has had its chance to
// restore), the feed opens too, as the place to open a vault or start
// writing. Returning to the editor from another route (Explorer, Settings)
// or refreshing the page doesn't re-run it, so a refresh stays on the note.
// Arriving through the landing page's "Resume" (atom_resumeRequested) counts
// as already handled: the restored tabs stay in front.
export function useVaultOpenBehavior() {
  const vaultKey = useAtomValue(atom_vaultKey);
  const hasVault = !!useAtomValue(atom_vaultHandle);
  const isVaultRestoring = useAtomValue(atom_isVaultRestoring);
  const [appliedFor, setAppliedFor] = useAtom(atom_vaultOpenBehaviorAppliedFor);
  const setHomeFeedOpen = useSetAtom(atom_homeFeedOpen);
  const [resumeRequested, setResumeRequested] = useAtom(atom_resumeRequested);

  useEffect(() => {
    const apply = (key: string) => {
      setAppliedFor(key);
      if (resumeRequested) setResumeRequested(false);
      else setHomeFeedOpen(true);
    };
    if (!hasVault) {
      if (isVaultRestoring || appliedFor === NO_VAULT_KEY) return;
      apply(NO_VAULT_KEY);
      return;
    }
    if (!vaultKey || appliedFor === vaultKey) return;
    apply(vaultKey);
  }, [hasVault, isVaultRestoring, vaultKey, appliedFor, resumeRequested, setAppliedFor, setHomeFeedOpen, setResumeRequested]);
}

import { useEffect } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { atom_vaultKey } from "@/app/atoms/atoms";
import { atom_homeFeedOpen, atom_onVaultOpen, atom_vaultOpenBehaviorAppliedFor } from "@/app/atoms/ui-atoms";

// Applies Settings → "On vault open" once per vault per session: with
// "home", the home feed opens while the restored tabs stay open behind it.
// Returning to the editor from another route (Explorer, Settings) doesn't
// re-run it.
export function useVaultOpenBehavior() {
  const vaultKey = useAtomValue(atom_vaultKey);
  const behavior = useAtomValue(atom_onVaultOpen);
  const [appliedFor, setAppliedFor] = useAtom(atom_vaultOpenBehaviorAppliedFor);
  const setHomeFeedOpen = useSetAtom(atom_homeFeedOpen);

  useEffect(() => {
    if (!vaultKey || appliedFor === vaultKey) return;
    setAppliedFor(vaultKey);
    if (behavior === "home") setHomeFeedOpen(true);
  }, [vaultKey, appliedFor, behavior, setAppliedFor, setHomeFeedOpen]);
}

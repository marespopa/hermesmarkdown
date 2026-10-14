import { useEffect, useRef } from "react";
import { useAtomValue } from "jotai";
import { atom_vaultHandle, atom_vaultKey } from "@/app/atoms/vault-atoms";
import { atom_vaultOpenBehaviorAppliedFor } from "@/app/atoms/ui-atoms";
import { clearToolHandoff, readToolHandoff, type ToolHandoff } from "@/app/utils/tool-handoff";
import type { PendingDraft } from "./use-draft-import";
import { NO_VAULT_KEY } from "./use-vault-open-behavior";

// Arrival of work handed over from a tool page (app/utils/tool-handoff.ts).
// The payload is read once on mount and held back until the vault has
// settled and the vault-open behavior has run for it (which may open the
// home feed), so `offerDraft` lands last and closes the feed over the new
// draft. The key is cleared as it's used, so a refresh never imports twice;
// the ref keeps StrictMode's double effects from offering it twice.
export function useToolHandoff({
  offerDraft,
  isVaultLocked,
}: {
  offerDraft: (draft: PendingDraft) => void;
  isVaultLocked: boolean;
}) {
  const pendingRef = useRef<ToolHandoff | null | undefined>(undefined);
  const hasVault = !!useAtomValue(atom_vaultHandle);
  const vaultKey = useAtomValue(atom_vaultKey);
  const appliedFor = useAtomValue(atom_vaultOpenBehaviorAppliedFor);

  useEffect(() => {
    if (pendingRef.current !== undefined) return;
    pendingRef.current = readToolHandoff();
  }, []);

  useEffect(() => {
    const handoff = pendingRef.current;
    if (!handoff || isVaultLocked) return;
    if (appliedFor !== (hasVault ? vaultKey : NO_VAULT_KEY)) return;
    pendingRef.current = null;
    clearToolHandoff();
    offerDraft({ text: handoff.markdown, name: handoff.title, origin: "tool" });
  }, [isVaultLocked, appliedFor, hasVault, vaultKey, offerDraft]);
}

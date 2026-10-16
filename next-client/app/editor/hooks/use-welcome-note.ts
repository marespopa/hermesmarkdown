import { useEffect, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { atom_vaultHandle, atom_vaultKey } from "@/app/atoms/vault-atoms";
import { atom_vaultOpenBehaviorAppliedFor } from "@/app/atoms/ui-atoms";
import { readToolHandoff } from "@/app/utils/tool-handoff";
import { welcomeNote } from "../utils/welcome-note";
import { isFirstRun } from "./use-first-run";
import type { PendingDraft } from "./use-draft-import";
import { NO_VAULT_KEY } from "./use-vault-open-behavior";

// The first visit opens the Welcome note in the draft, a short tour read in
// the editor itself. Like useToolHandoff, it waits until the vault has
// settled and the vault-open behavior has run (which may open the home
// feed), so it lands last. Work handed over from a tool page wins: no
// welcome then. The ref keeps StrictMode's double effects from offering it
// twice.
export function useWelcomeNote({
  offerDraft,
  isVaultLocked,
  isMobileChrome,
}: {
  offerDraft: (draft: PendingDraft) => void;
  isVaultLocked: boolean;
  isMobileChrome: boolean;
}) {
  const [pending] = useState(() => isFirstRun() && !readToolHandoff());
  const done = useRef(false);
  const hasVault = !!useAtomValue(atom_vaultHandle);
  const vaultKey = useAtomValue(atom_vaultKey);
  const appliedFor = useAtomValue(atom_vaultOpenBehaviorAppliedFor);

  useEffect(() => {
    if (!pending || done.current || isVaultLocked) return;
    if (appliedFor !== (hasVault ? vaultKey : NO_VAULT_KEY)) return;
    done.current = true;
    offerDraft({ text: welcomeNote(isMobileChrome), name: "Welcome" });
  }, [pending, isVaultLocked, appliedFor, hasVault, vaultKey, offerDraft, isMobileChrome]);
}

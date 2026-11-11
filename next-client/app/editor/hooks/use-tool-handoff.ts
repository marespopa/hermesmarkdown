import { useEffect, useRef } from "react";
import { clearToolHandoff, readToolHandoff, type ToolHandoff } from "@/app/utils/tool-handoff";
import type { PendingDraft } from "./use-draft-import";

// Arrival of work handed over from a tool page (app/utils/tool-handoff.ts).
// The payload is read once on mount and held back until the vault has
// settled, so `offerDraft` lands after the restored tabs. The key is cleared
// as it's used, so a refresh never imports twice; the ref keeps StrictMode's
// double effects from offering it twice.
export function useToolHandoff({
  offerDraft,
  isVaultLocked,
}: {
  offerDraft: (draft: PendingDraft) => void;
  isVaultLocked: boolean;
}) {
  const pendingRef = useRef<ToolHandoff | null | undefined>(undefined);

  useEffect(() => {
    if (pendingRef.current !== undefined) return;
    pendingRef.current = readToolHandoff();
  }, []);

  useEffect(() => {
    const handoff = pendingRef.current;
    if (!handoff || isVaultLocked) return;
    pendingRef.current = null;
    clearToolHandoff();
    offerDraft({ text: handoff.markdown, name: handoff.title, origin: "tool" });
  }, [isVaultLocked, offerDraft]);
}

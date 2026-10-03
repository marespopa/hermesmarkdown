"use client";

import { useEffect, type ReactNode } from "react";
import { useAtomValue } from "jotai";
import { atom_isVaultRestoring, atom_isVaultUnlocking } from "@/app/atoms/atoms";
import { useVaultManager } from "@/app/hooks/file-system/use-vault-manager";
import EditorSkeleton from "./EditorSkeleton";
import VaultPendingOverlay from "./VaultPendingOverlay";

// Wraps every /editor route (editor, Tasks, Explorer, Settings): restores
// the saved vault on load, and keeps the route out of reach until it's
// readable. While the saved vault is being looked up, only the editor
// skeleton shows; while it waits for the user to grant access again, the
// route stays mounted but hidden and inert behind "Vault Access Paused" over
// the skeleton. Any click or key press then asks the browser for access, so
// no separate button press is needed. Once access is granted the prompt goes
// and the skeleton stays until the vault is loaded and "Vault restored" shows.
export default function VaultAccessGate({ children }: { children: ReactNode }) {
  const { isVaultPending, restoreVault } = useVaultManager();
  const isVaultRestoring = useAtomValue(atom_isVaultRestoring);
  const isVaultUnlocking = useAtomValue(atom_isVaultUnlocking);

  useEffect(() => {
    if (!isVaultPending || isVaultUnlocking) return;
    // requestPermission needs user activation. A touch only grants it when the
    // finger lifts, so listen for click rather than pointerdown. restoreVault
    // ignores calls while one is in flight; a denied prompt can be retried.
    const onGesture = () => restoreVault();
    window.addEventListener("click", onGesture);
    window.addEventListener("keydown", onGesture);
    return () => {
      window.removeEventListener("click", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
  }, [isVaultPending, isVaultUnlocking, restoreVault]);

  if (isVaultRestoring) return <EditorSkeleton />;

  return (
    <>
      <div inert={isVaultPending} className={isVaultPending ? "invisible" : undefined}>
        {children}
      </div>
      {isVaultPending && (
        <>
          <EditorSkeleton />
          {!isVaultUnlocking && <VaultPendingOverlay restoreVault={restoreVault} />}
        </>
      )}
    </>
  );
}

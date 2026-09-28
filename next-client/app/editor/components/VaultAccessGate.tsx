"use client";

import type { ReactNode } from "react";
import { useAtomValue } from "jotai";
import { atom_isVaultRestoring } from "@/app/atoms/atoms";
import { useVaultManager } from "@/app/hooks/file-system/use-vault-manager";
import VaultPendingOverlay from "./VaultPendingOverlay";

// Wraps every /editor route (editor, Tasks, Explorer, Settings): restores
// the saved vault on load, and keeps the route out of reach until it's
// readable. While the saved vault is being looked up nothing renders; while
// it waits for the user to grant access again, the route stays mounted but
// hidden and inert behind "Vault Access Paused".
export default function VaultAccessGate({ children }: { children: ReactNode }) {
  const { isVaultPending, restoreVault } = useVaultManager();
  const isVaultRestoring = useAtomValue(atom_isVaultRestoring);

  if (isVaultRestoring) return <div className="fixed inset-0 bg-surface" />;

  return (
    <>
      <div inert={isVaultPending} className={isVaultPending ? "invisible" : undefined}>
        {children}
      </div>
      {isVaultPending && (
        <>
          <div className="fixed inset-0 bg-surface" />
          <VaultPendingOverlay restoreVault={restoreVault} />
        </>
      )}
    </>
  );
}

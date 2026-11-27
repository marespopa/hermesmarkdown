"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useAtomValue } from "jotai";
import { atom_isVaultRestoring, atom_isVaultUnlocking, atom_openingVaultName } from "@/app/atoms/atoms";
import { atom_openNotesHydrated } from "@/app/atoms/file-atoms";
import { useVaultManager } from "@/app/hooks/file-system/use-vault-manager";
import { useStartupWatchdog } from "../hooks/use-startup-watchdog";
import LoadingOverlay from "@/app/components/LoadingOverlay";
import EditorSkeleton from "./EditorSkeleton";
import VaultPendingOverlay, { VAULT_ESCAPE_ATTR } from "./VaultPendingOverlay";
import { useRecentVaults } from "../hooks/use-recent-vaults";
import { realHandle } from "@/app/services/library-roots";

// Keys that move focus or only modify another: they never count as the
// "press any key" that asks for access, so the screen can be tabbed through.
const NON_GESTURE_KEYS = new Set(["Tab", "Shift", "Control", "Alt", "Meta", "CapsLock", "Escape"]);

// Wraps every /editor route (editor, Tasks, Files, Settings): restores
// the saved vault on load, and keeps the route out of reach until it's
// readable. While the saved vault is being looked up, only the editor
// skeleton shows; while it waits for the user to grant access again, the
// route stays mounted but hidden and inert behind "Vault Access Paused" over
// the skeleton. Any click or key press then asks the browser for access, so
// no separate button press is needed, except on the screen's "Or open another
// vault" choices (a recent vault, or a folder picked anew), which switch vaults
// without asking for the paused one: the way out when it can't be allowed.
// A refused ask says so and offers Try Again. Once access is granted the prompt goes
// and the skeleton stays until the vault is loaded and "Vault restored" shows.
// If the skeleton stays past 10 seconds (use-startup-watchdog.ts), a toast offers a reload.
// While the user opens another vault, "Opening <name>..." covers the route
// until its open notes and top folder are read.
export default function VaultAccessGate({ children }: { children: ReactNode }) {
  const { isVaultPending, restoreVault, openVault, vaultHandle } = useVaultManager();
  const { recentVaults, openRecentVault } = useRecentVaults();
  // The last tap's ask was refused (or no prompt came up): say so on the screen.
  const [denied, setDenied] = useState(false);
  const restore = useCallback(async () => {
    const result = await restoreVault();
    if (result === "granted" || result === "denied") setDenied(result === "denied");
  }, [restoreVault]);
  const isVaultRestoring = useAtomValue(atom_isVaultRestoring);
  const isVaultUnlocking = useAtomValue(atom_isVaultUnlocking);
  const openingVaultName = useAtomValue(atom_openingVaultName);
  const notesHydrated = useAtomValue(atom_openNotesHydrated);

  // Skeleton up with nothing for the user to do: offer a reload if it lasts.
  // The startup ask for access is capped at about 4 seconds (askPermissionWithin),
  // so the watchdog runs while it is open too.
  useStartupWatchdog(isVaultRestoring || (isVaultPending && isVaultUnlocking) || !notesHydrated);

  useEffect(() => {
    if (!isVaultPending || isVaultUnlocking) return;
    // requestPermission needs user activation. A touch only grants it when the
    // finger lifts, so listen for click rather than pointerdown. restoreVault
    // ignores calls while one is in flight; a denied prompt can be retried.
    const onGesture = (event: Event) => {
      const target = event.target;
      if (target instanceof Element && target.closest(`[${VAULT_ESCAPE_ATTR}]`)) return;
      if (event instanceof KeyboardEvent && NON_GESTURE_KEYS.has(event.key)) return;
      void restore();
    };
    window.addEventListener("click", onGesture);
    window.addEventListener("keydown", onGesture);
    return () => {
      window.removeEventListener("click", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
  }, [isVaultPending, isVaultUnlocking, restore]);

  if (isVaultRestoring) return <EditorSkeleton />;

  return (
    <>
      <div inert={isVaultPending} className={isVaultPending ? "invisible" : undefined}>
        {children}
      </div>
      {isVaultPending && (
        <>
          <EditorSkeleton />
          {!isVaultUnlocking && (
            <VaultPendingOverlay
              restoreVault={() => void restore()}
              vaultName={vaultHandle ? realHandle(vaultHandle).name : undefined}
              denied={denied}
              otherVaults={recentVaults}
              onOpenRecent={(entry) => void openRecentVault(entry)}
              onOpenFolder={() => void openVault()}
            />
          )}
        </>
      )}
      {/* Switching vaults: covers the old vault until the new one is readable. */}
      <LoadingOverlay isVisible={openingVaultName !== null} text={`Opening ${openingVaultName}...`} />
    </>
  );
}

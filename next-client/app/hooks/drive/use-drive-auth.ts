"use client";

import { useEffect, useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import {
  atom_driveAuthState,
  atom_driveVaultId,
  atom_showDriveFolderPicker,
} from '@/app/atoms/drive-atoms';
import {
  isTokenValid,
  clearTokens,
  startOAuthFlow,
} from '@/app/services/drive/auth';

export function useDriveAuth() {
  const [authState, setAuthState] = useAtom(atom_driveAuthState);
  const driveVaultId = useAtomValue(atom_driveVaultId);
  const [, setShowDriveFolderPicker] = useAtom(atom_showDriveFolderPicker);

  // Detect OAuth callback (via sessionStorage flag set by /auth/google/callback page)
  // or restore from existing stored token on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const justAuthed = sessionStorage.getItem('hermes_drive_just_authed');
    if (justAuthed) {
      sessionStorage.removeItem('hermes_drive_just_authed');
      if (isTokenValid()) {
        setAuthState('authenticated');
        // Open folder picker if this is the first time connecting (no vault yet)
        const storedVaultId = localStorage.getItem('hermes_drive_vault_id');
        if (!storedVaultId || storedVaultId === 'null') {
          setShowDriveFolderPicker(true);
        }
        return;
      }
    }

    // Restore from existing token if a vault is configured
    if (driveVaultId) {
      setAuthState(isTokenValid() ? 'authenticated' : 'expired');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Mount only

  const signIn = useCallback(() => {
    setAuthState('authenticating');
    startOAuthFlow();
  }, [setAuthState]);

  const signOut = useCallback(() => {
    clearTokens();
    setAuthState('unauthenticated');
  }, [setAuthState]);

  return { authState, signIn, signOut };
}

"use client";

import { useEffect, useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import toast from 'react-hot-toast';
import {
  atom_driveAuthState,
  atom_driveVaultId,
  atom_showDriveFolderPicker,
} from '@/app/atoms/drive-atoms';
import {
  isTokenValid,
  clearTokens,
  startOAuthFlow,
  refreshTokenSilently,
  getTokenExpiry,
} from '@/app/services/drive/auth';

// Refresh this long before actual expiry so requests never race a stale token.
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

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
        const storedVaultId = localStorage.getItem('hermes_drive_vault_id');
        if (!storedVaultId || storedVaultId === 'null') {
          // First-time connection — open folder picker
          setShowDriveFolderPicker(true);
        } else {
          // Reconnect — vault will be restored by the vault manager mount effect
          toast.success('Reconnected to Google Drive', { id: 'drive-reconnected' });
        }
        return;
      }
    }

    // Restore from existing token if a vault is configured. If the stored
    // token has expired, try a silent refresh (same Google session, prior
    // consent) before falling back to the "expired" reconnect banner.
    if (driveVaultId) {
      if (isTokenValid()) {
        setAuthState('authenticated');
        return;
      }
      setAuthState('authenticating');
      refreshTokenSilently().then((token) => {
        setAuthState(token ? 'authenticated' : 'expired');
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Mount only

  // While authenticated, proactively refresh the token before it expires so
  // in-flight/background saves never hit a 401 in the first place.
  useEffect(() => {
    if (authState !== 'authenticated') return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const scheduleNext = () => {
      const expiry = getTokenExpiry();
      const delay = expiry ? Math.max(expiry - Date.now() - REFRESH_MARGIN_MS, 0) : REFRESH_MARGIN_MS;
      timer = setTimeout(async () => {
        const token = await refreshTokenSilently();
        if (cancelled) return;
        if (!token) {
          setAuthState('expired');
          return;
        }
        scheduleNext();
      }, delay);
    };

    scheduleNext();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [authState, setAuthState]);

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

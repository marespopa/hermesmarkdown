import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { DrivePathIndex } from '../services/drive/path-index';
import { isTokenValid } from '../services/drive/auth';

export type DriveAuthState = 'unauthenticated' | 'authenticating' | 'authenticated' | 'expired';

function getInitialDriveAuthState(): DriveAuthState {
  if (typeof window === 'undefined') return 'unauthenticated';
  const vaultId = localStorage.getItem('hermes_drive_vault_id');
  if (!vaultId || vaultId === 'null') return 'unauthenticated';
  return isTokenValid() ? 'authenticated' : 'expired';
}

// Persisted across sessions
export const atom_driveVaultId = atomWithStorage<string | null>('hermes_drive_vault_id', null);
export const atom_driveVaultName = atomWithStorage<string | null>('hermes_drive_vault_name', null);

// In-memory only — initialized from token state so isDriveVault is correct on first render
export const atom_driveAuthState = atom<DriveAuthState>(getInitialDriveAuthState());
export const atom_drivePathIndex = atom<DrivePathIndex | null>(null);
export const atom_hasDriveLoaded = atom<boolean>(false);

// Drive folder picker modal visibility
export const atom_showDriveFolderPicker = atom<boolean>(false);

// Derived: true when a Drive vault is active (auth state may be expired — UI shows banner)
export const atom_isDriveVault = atom<boolean>((get) => {
  const id = get(atom_driveVaultId);
  const authState = get(atom_driveAuthState);
  return id !== null && (authState === 'authenticated' || authState === 'expired');
});

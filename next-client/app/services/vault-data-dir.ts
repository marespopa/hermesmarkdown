// The vault's own data folder: just the Trash (`trash/`). Created only when
// something is moved to the Trash; hidden like any dotfolder, never indexed
// as notes. Pins and AI skills are the app's,
// never in the vault.
export const VAULT_DATA_DIR = ".hermesmarkdown";

export function isVaultDataPath(path: string): boolean {
  return path === VAULT_DATA_DIR || path.startsWith(`${VAULT_DATA_DIR}/`);
}

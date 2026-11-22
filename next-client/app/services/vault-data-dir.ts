import { stripMount } from "./library-roots";

// The vault's own data folder: just the Trash (`trash/`). Created only when
// something is moved to the Trash; hidden like any dotfolder, never indexed
// as notes. Pins and AI skills are the app's,
// never in the vault.
export const VAULT_DATA_DIR = ".hermesmarkdown";

// In any folder of a library (`Work/.hermesmarkdown/…` too).
export function isVaultDataPath(path: string): boolean {
  const inFolder = stripMount(path);
  return inFolder === VAULT_DATA_DIR || inFolder.startsWith(`${VAULT_DATA_DIR}/`);
}

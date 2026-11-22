// The vault's Trash: deleted notes and folders move to `.hermesmarkdown/trash/` so
// a delete can be undone. Each deleted item gets its own slot folder, named
// by when it was deleted, so two items with the same name never clash and
// old slots can be emptied by age, and records where its item came from
// (TRASH_ORIGIN_FILE) so it can be put back. The Trash is never indexed,
// synced or exported.
import { VAULT_DATA_DIR } from "./vault-data-dir";
import { mountPrefix, stripMount } from "./library-roots";

export const TRASH_DIR = `${VAULT_DATA_DIR}/trash`;
export const TRASH_RETENTION_DAYS = 30;
// In each slot beside the item: the vault path it was deleted from.
export const TRASH_ORIGIN_FILE = ".origin";

// Each folder of a library has its own Trash (`Work/.hermesmarkdown/trash`
// for an added folder), so a deleted file never moves to another folder.
export function isTrashPath(path: string): boolean {
  const inFolder = stripMount(path);
  return inFolder === TRASH_DIR || inFolder.startsWith(`${TRASH_DIR}/`);
}

// The Trash a trashed item's path is in ("Work/.hermesmarkdown/trash" for
// "Work/.hermesmarkdown/trash/<slot>/a.md").
export function trashDirOf(trashPath: string): string {
  return trashDirFor(trashPath);
}

// The Trash of the library folder `path` is in.
export function trashDirFor(path: string): string {
  return `${mountPrefix(path)}${TRASH_DIR}`;
}

// "2026-10-06T09-43-55-123Z-0": sortable, filename-safe, and unique per item
// within one delete.
export function trashSlotName(now: Date, index: number): string {
  return `${now.toISOString().replace(/[:.]/g, "-")}-${index}`;
}

// When the slot was made, or null for a folder that isn't a slot.
export function trashSlotDate(slotName: string): Date | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z-\d+$/.exec(slotName);
  if (!match) return null;
  const [, day, hours, minutes, seconds, ms] = match;
  const date = new Date(`${day}T${hours}:${minutes}:${seconds}.${ms}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isTrashSlotExpired(slotName: string, now: Date, retentionDays = TRASH_RETENTION_DAYS): boolean {
  const date = trashSlotDate(slotName);
  return !!date && now.getTime() - date.getTime() > retentionDays * 24 * 60 * 60 * 1000;
}

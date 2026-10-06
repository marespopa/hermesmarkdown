// The vault's Trash: deleted notes and folders move to `.hermes/trash/` so
// a delete can be undone. Each deleted item gets its own slot folder, named
// by when it was deleted, so two items with the same name never clash and
// old slots can be emptied by age. The Trash is never indexed, synced or
// exported.

export const TRASH_DIR = ".hermes/trash";
export const TRASH_RETENTION_DAYS = 30;

export function isTrashPath(path: string): boolean {
  return path === TRASH_DIR || path.startsWith(`${TRASH_DIR}/`);
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

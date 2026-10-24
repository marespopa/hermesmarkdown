import { parsePinItem, type Pin } from "@/app/services/vault-pins-format";

// The pins last read for each vault on this device, keyed by vault
// (atom_vaultKey), so the sidebar shows them the moment a vault opens while
// usePinsSync reads `.hermesmarkdown/pins.yaml` (the file always wins). Only a cache:
// any odd entry is dropped, and blocked storage just means no head start.
export const PINS_CACHE_KEY = "hermes_pins_cache";

function readStore(): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PINS_CACHE_KEY) || "{}");
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

// The vault's cached pins, or null when this device hasn't read them yet.
export function readCachedPins(vaultKey: string): Pin[] | null {
  const entries = readStore()[vaultKey];
  if (!Array.isArray(entries)) return null;
  return entries.flatMap((entry): Pin[] => {
    if (!entry || typeof entry !== "object") return [];
    const { kind, target, icon } = entry as Partial<Pin>;
    if (typeof kind !== "string" || typeof target !== "string") return [];
    const pin = parsePinItem({ [kind]: target, ...(icon ? { icon } : {}) });
    return pin ? [pin] : [];
  });
}

export function cachePins(vaultKey: string, pins: readonly Pin[]): void {
  const stored = readStore();
  stored[vaultKey] = pins.map(({ kind, target, icon }) => ({ kind, target, icon }));
  try {
    localStorage.setItem(PINS_CACHE_KEY, JSON.stringify(stored));
  } catch {
    // Storage blocked or full: the next open waits for the file instead.
  }
}

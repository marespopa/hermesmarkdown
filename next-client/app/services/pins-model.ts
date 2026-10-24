// The sidebar's pins for a vault: notes, folders, tags and app pages, each
// with an optional emoji icon, in order. Pure: the entry rules and the
// edits; they're kept per vault on this device (pins-store.ts). The edits
// work on a document of raw entries, so an entry the app doesn't recognise
// (or a duplicate) isn't listed but keeps its place.
import { remapPath } from "@/app/atoms/utils";
import { normalizeTag } from "@/app/utils/tag-normalize";

export const PIN_PAGES = ["files", "tags", "tasks", "templates", "trash", "settings"] as const;
export type PinPage = (typeof PIN_PAGES)[number];
export type PinKind = "note" | "folder" | "tag" | "page";
export interface Pin {
  kind: PinKind;
  target: string;
  icon: string | null;
}
export const pinKey = (pin: Pick<Pin, "kind" | "target">) => `${pin.kind}:${pin.target}`;

// The pins as raw entries ({ note: "a.md", icon: "🚀" }), in order.
export interface PinsDocument {
  items: unknown[];
}

// The most pins listed: one per Ctrl/Cmd+1–9 shortcut.
export const PINS_MAX = 9;

const KINDS: readonly PinKind[] = ["note", "folder", "tag", "page"];
const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u;
const MAX_ICON_LENGTH = 32;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// Exactly one emoji grapheme (🚀, 🇷🇴, 1️⃣, 🧑‍💻), trimmed; anything else is null.
export function normalizePinIcon(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const icon = value.trim();
  if (!icon || icon.length > MAX_ICON_LENGTH || !EMOJI.test(icon)) return null;
  if (typeof Intl.Segmenter === "function") {
    const graphemes = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(icon)];
    if (graphemes.length !== 1) return null;
  }
  return icon;
}

// A vault-relative path: leading `./` and `/` stripped; backslashes, empty,
// `.` and `..` segments rejected.
function vaultPath(value: string): string | null {
  const path = value.trim().replace(/^(?:\.\/|\/)+/, "");
  if (!path || path.includes("\\")) return null;
  return path.split("/").some((part) => !part || part === "." || part === "..") ? null : path;
}

function normalizeTarget(kind: PinKind, value: string): string | null {
  switch (kind) {
    case "note": {
      const path = vaultPath(value);
      return path && /\.md$/i.test(path) ? path : null;
    }
    case "folder":
      return vaultPath(value.trim().replace(/\/+$/, ""));
    case "tag":
      return normalizeTag(value) || null;
    case "page":
      return (PIN_PAGES as readonly string[]).includes(value.trim()) ? value.trim() : null;
  }
}

// One entry: a mapping with exactly one kind key holding a non-empty string,
// plus an optional `icon`. Null when it breaks the rules.
export function parsePinItem(raw: unknown): Pin | null {
  if (!isRecord(raw)) return null;
  const kinds = KINDS.filter((kind) => kind in raw);
  if (kinds.length !== 1) return null;
  const kind = kinds[0];
  const value = raw[kind];
  if (typeof value !== "string") return null;
  const target = normalizeTarget(kind, value);
  return target ? { kind, target, icon: normalizePinIcon(raw.icon) } : null;
}

// The recognised entries, the first of each kind and target.
export function listedPins(doc: PinsDocument): Pin[] {
  const seen = new Set<string>();
  const pins: Pin[] = [];
  for (const raw of doc.items) {
    const pin = parsePinItem(raw);
    if (!pin || seen.has(pinKey(pin))) continue;
    seen.add(pinKey(pin));
    pins.push(pin);
  }
  return pins;
}

// The pins as a document, for the edits.
export const pinsDocument = (pins: readonly Pin[]): PinsDocument => ({
  items: pins.map(({ kind, target, icon }) => (icon ? { [kind]: target, icon } : { [kind]: target })),
});

// Each edit returns a new document, or null when nothing changes (no write).
// Entries are copied before they change, so the input is never mutated.

const keyOf = (raw: unknown): string | null => {
  const pin = parsePinItem(raw);
  return pin ? pinKey(pin) : null;
};

// The pins not already listed, valid and distinct, in order.
function newPins(doc: PinsDocument, pins: Pick<Pin, "kind" | "target">[]): Pin[] {
  const present = new Set(listedPins(doc).map(pinKey));
  return pins.flatMap(({ kind, target }) => {
    const pin = parsePinItem({ [kind]: target });
    if (!pin || present.has(pinKey(pin))) return [];
    present.add(pinKey(pin));
    return [pin];
  });
}

// Whether some of `pins` are new and adding them would list more than PINS_MAX.
export function pinsOverLimit(doc: PinsDocument, pins: Pick<Pin, "kind" | "target">[]): boolean {
  const added = newPins(doc, pins).length;
  return added > 0 && listedPins(doc).length + added > PINS_MAX;
}

// Appends the pins not already listed (invalid targets skipped), in order,
// as many as fit under PINS_MAX.
export function addPins(doc: PinsDocument, pins: Pick<Pin, "kind" | "target">[]): PinsDocument | null {
  const room = Math.max(0, PINS_MAX - listedPins(doc).length);
  const added = newPins(doc, pins).slice(0, room).map((pin) => ({ [pin.kind]: pin.target }));
  return added.length ? { ...doc, items: [...doc.items, ...added] } : null;
}

// Removes every entry for `key` (a hidden duplicate too, or it would surface).
export function removePin(doc: PinsDocument, key: string): PinsDocument | null {
  const items = doc.items.filter((raw) => keyOf(raw) !== key);
  return items.length === doc.items.length ? null : { ...doc, items };
}

// Sets, replaces or (with null) clears the listed entry's icon, keeping its
// other keys.
export function setPinIcon(doc: PinsDocument, key: string, icon: string | null): PinsDocument | null {
  const index = doc.items.findIndex((raw) => keyOf(raw) === key);
  if (index === -1) return null;
  const entry = doc.items[index] as Record<string, unknown>;
  const next = icon === null ? null : normalizePinIcon(icon);
  if (icon !== null && !next) return null;
  if (next === null ? !("icon" in entry) : entry.icon === next) return null;
  const rest = { ...entry };
  delete rest.icon;
  const items = [...doc.items];
  items[index] = next === null ? rest : { ...rest, icon: next };
  return { ...doc, items };
}

// Moves the entry for `key` to position `to` among `listed` (the rows the
// sidebar shows); every other entry keeps its place (placePins).
export function movePin(doc: PinsDocument, key: string, to: number, listed: readonly string[]): PinsDocument | null {
  const from = listed.indexOf(key);
  if (from === -1 || to < 0 || to >= listed.length || to === from) return null;
  return placePins(doc, [key], to > from ? to + 1 : to, listed);
}

// Places the listed pins `keys` at insertion point `at` of `listed` (0 above
// the first row up to the count below the last). The
// listed entries are reordered within the places they already hold, so
// hidden and unrecognised entries keep theirs.
function placePins(doc: PinsDocument, keys: readonly string[], at: number, listed: readonly string[]): PinsDocument | null {
  const current = listedPins(doc).map(pinKey);
  const moving = [...new Set(keys)].filter((key) => current.includes(key));
  if (!moving.length) return null;
  const before = new Set(listed.slice(0, Math.max(0, at)));
  const rest = current.filter((key) => !moving.includes(key));
  const split = rest.filter((key) => before.has(key)).length;
  const order = [...rest.slice(0, split), ...moving, ...rest.slice(split)];
  if (order.every((key, i) => key === current[i])) return null;
  const slots = current.map((key) => doc.items.findIndex((raw) => keyOf(raw) === key));
  const items = [...doc.items];
  order.forEach((key, i) => {
    items[slots[i]] = doc.items[slots[current.indexOf(key)]];
  });
  return { ...doc, items };
}

// Note and folder pins at `oldPath` or under it follow a rename or move.
export function remapPinPaths(doc: PinsDocument, oldPath: string, newPath: string): PinsDocument | null {
  let changed = false;
  const items = doc.items.map((raw) => {
    const pin = parsePinItem(raw);
    if (!pin || (pin.kind !== "note" && pin.kind !== "folder")) return raw;
    const target = remapPath(pin.target, oldPath, newPath);
    if (target === null || target === pin.target) return raw;
    changed = true;
    return { ...(raw as Record<string, unknown>), [pin.kind]: target };
  });
  return changed ? { ...doc, items } : null;
}

// Note and folder pins at a deleted path or under it are removed.
export function forgetPinPaths(doc: PinsDocument, deletedPath: string): PinsDocument | null {
  const items = doc.items.filter((raw) => {
    const pin = parsePinItem(raw);
    if (!pin || (pin.kind !== "note" && pin.kind !== "folder")) return true;
    return remapPath(pin.target, deletedPath, deletedPath) === null;
  });
  return items.length === doc.items.length ? null : { ...doc, items };
}

export function samePins(a: readonly Pin[], b: readonly Pin[]): boolean {
  return a.length === b.length && a.every((pin, i) => pin.kind === b[i].kind && pin.target === b[i].target && pin.icon === b[i].icon);
}

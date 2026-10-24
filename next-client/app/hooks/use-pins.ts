"use client";

import { useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import toast from "react-hot-toast";
import { atom_pins, atom_updatePins, type PinsEdit, type PinsWriteResult } from "@/app/atoms/pin-atoms";
import { addPins, movePin, pinKey, PINS_MAX, pinsOverLimit, removePin, setPinIcon, type Pin, type PinKind } from "@/app/services/pins-model";
import { normalizeTag } from "@/app/utils/tag-normalize";

const targetOf = (kind: PinKind, target: string) => (kind === "tag" ? normalizeTag(target) : target);

export const PINS_FULL_MESSAGE = `You can pin up to ${PINS_MAX} items. Unpin one to make room.`;

// The open vault's pins (pin-atoms.ts) for components: what's pinned, and
// each change, saved at once through atom_updatePins. Everything resolves to
// its result. At most PINS_MAX are listed: a pin past that isn't added, and
// a toast says why.
export function usePins(): {
  pins: readonly Pin[];
  isPinned: (kind: PinKind, target: string) => boolean;
  pin: (kind: PinKind, target: string) => Promise<PinsWriteResult>;
  togglePin: (kind: PinKind, target: string) => Promise<PinsWriteResult>;
  unpin: (key: string) => Promise<PinsWriteResult>;
  setIcon: (key: string, icon: string | null) => Promise<PinsWriteResult>;
  move: (key: string, to: number, listed: readonly string[]) => Promise<PinsWriteResult>;
} {
  const pins = useAtomValue(atom_pins);
  const update = useSetAtom(atom_updatePins);

  const isPinned = useCallback((kind: PinKind, target: string) => {
    const key = pinKey({ kind, target: targetOf(kind, target) });
    return pins.some((pin) => pinKey(pin) === key);
  }, [pins]);

  // An edit that adds `items`: when they don't all fit under PINS_MAX, the
  // toast says so after the edit.
  const adding = useCallback(async (items: Pick<Pin, "kind" | "target">[], edit: PinsEdit) => {
    let full = false;
    const result = await update((doc, current) => {
      full = pinsOverLimit(doc, items);
      return edit(doc, current);
    });
    if (full) toast.error(PINS_FULL_MESSAGE);
    return result;
  }, [update]);

  const pin = useCallback((kind: PinKind, target: string) => {
    const items = [{ kind, target: targetOf(kind, target) }];
    return adding(items, (doc) => addPins(doc, items));
  }, [adding]);

  const togglePin = useCallback((kind: PinKind, target: string) => {
    const item = { kind, target: targetOf(kind, target) };
    const key = pinKey(item);
    return adding([item], (doc, current) => (current.some((p) => pinKey(p) === key) ? removePin(doc, key) : addPins(doc, [item])));
  }, [adding]);

  const unpin = useCallback((key: string) => update((doc) => removePin(doc, key)), [update]);
  const setIcon = useCallback((key: string, icon: string | null) => update((doc) => setPinIcon(doc, key, icon)), [update]);
  const move = useCallback(
    (key: string, to: number, listed: readonly string[]) => update((doc) => movePin(doc, key, to, listed)),
    [update],
  );

  return { pins, isPinned, pin, togglePin, unpin, setIcon, move };
}

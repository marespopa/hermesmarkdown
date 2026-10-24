"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Button from "@/app/components/Button";
import BareInput from "@/app/components/Input/BareInput";
import { FIELD_COMPACT_CLASS } from "@/app/components/Input/field-styles";
import { normalizePinIcon } from "@/app/services/pins-model";
import { loadEmojiIndex, matchEmojis, type EmojiEntry } from "../codemirror/emoji-index";
import { MENU_PANEL_CLASS, MENU_SEPARATOR_CLASS } from "./menu-classes";

interface PinIconPopoverProps {
  /** The pinned row it opened from: the popover hangs below its left edge. */
  anchor: DOMRect;
  /** The pin's icon now, marked pressed in the grid. */
  current: string | null;
  /** Saves an icon (null removes it); resolves true once written. */
  onPick: (icon: string | null) => Promise<boolean>;
  onClose: () => void;
}

const EDGE = 8;
const MAX_TILES = 64;

interface Tile {
  emoji: string;
  name: string;
}

// A pinned row's emoji picker (the sidebar's Pinned section): a search field
// over the app's local emoji index (emoji-index.ts; curated ones first with
// nothing typed), a grid of up to 64 matches, and Remove Icon. A single
// emoji pasted into the field is offered as the first tile. Enter picks the
// first tile, a click picks that one; either closes the popover once the
// write went through (a failed write toasts and leaves it open). Escape or a
// click outside closes it without writing. Rendered into `document.body` in
// the shared menu look, kept on screen like FolderPopover.
export default function PinIconPopover({ anchor, current, onPick, onClose }: PinIconPopoverProps) {
  const [entries, setEntries] = useState<EmojiEntry[] | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState({ x: anchor.left, y: anchor.bottom + 4, ready: false });

  useEffect(() => {
    let live = true;
    void loadEmojiIndex().then((index) => {
      if (live) setEntries(index);
    });
    return () => {
      live = false;
    };
  }, []);

  const tiles = useMemo<Tile[]>(() => {
    const typed = query.trim();
    const pasted = normalizePinIcon(typed);
    const matches = entries && !pasted ? matchEmojis(entries, typed.replace(/\s+/g, "_")) : [];
    const pastedTile = pasted
      ? [{ emoji: pasted, name: entries?.find((entry) => entry.emoji === pasted)?.name ?? "pasted emoji" }]
      : [];
    return [...pastedTile, ...matches.map(({ emoji, name }) => ({ emoji, name }))].slice(0, MAX_TILES);
  }, [entries, query]);

  const pick = async (icon: string | null) => {
    if (busy) return;
    setBusy(true);
    const saved = await onPick(icon);
    setBusy(false);
    if (saved) onClose();
  };

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [onClose]);

  // Focus goes to the search field, and back where it was on close.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    inputRef.current?.focus({ preventScroll: true });
    return () => {
      if (previous?.isConnected && (!document.activeElement || document.activeElement === document.body)) {
        previous.focus({ preventScroll: true });
      }
    };
  }, []);

  useLayoutEffect(() => {
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(EDGE, Math.min(anchor.left, window.innerWidth - rect.width - EDGE));
    const below = anchor.bottom + 4;
    const y = below + rect.height > window.innerHeight - EDGE ? Math.max(EDGE, window.innerHeight - rect.height - EDGE) : below;
    setPos({ x, y, ready: true });
  }, [anchor]);

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Pin icon"
      // Escape closes the popover only: portaled, its keys still bubble to
      // the sidebar, whose Escape would hide it.
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      style={{ left: pos.x, top: pos.y }}
      className={`${MENU_PANEL_CLASS} w-[min(18.5rem,calc(100vw-16px))] origin-top-left transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none ${pos.ready ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
    >
      <BareInput
        ref={inputRef}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          if (tiles[0]) void pick(tiles[0].emoji);
        }}
        placeholder="Search emoji"
        aria-label="Search emoji"
        spellCheck={false}
        className={`${FIELD_COMPACT_CLASS} mx-1 my-1`}
      />
      {!entries && !tiles.length ? (
        <p className="px-2.5 py-2 text-ui-footnote text-fg-faint">Loading emoji…</p>
      ) : !tiles.length ? (
        <p className="px-2.5 py-2 text-ui-footnote text-fg-faint">No emoji found</p>
      ) : (
        <div role="group" aria-label="Emoji" className="grid max-h-56 grid-cols-8 gap-0.5 overflow-y-auto px-1">
          {tiles.map((tile) => (
            <Button
              key={`${tile.name}:${tile.emoji}`}
              variant="unstyled"
              aria-label={tile.name.replace(/_/g, " ")}
              aria-pressed={tile.emoji === current}
              title={tile.name.replace(/_/g, " ")}
              onClick={() => void pick(tile.emoji)}
              className="flex aspect-square w-full items-center justify-center rounded-md text-lg leading-none transition-colors hover:bg-fill aria-pressed:bg-accent/15"
            >
              <span aria-hidden="true">{tile.emoji}</span>
            </Button>
          ))}
        </div>
      )}
      <div role="separator" className={MENU_SEPARATOR_CLASS} />
      <div className="px-1 pb-0.5">
        <Button variant="secondary" isDisabled={!current || busy} onClick={() => void pick(null)} className="w-full">
          Remove Icon
        </Button>
      </div>
    </div>,
    document.body,
  );
}

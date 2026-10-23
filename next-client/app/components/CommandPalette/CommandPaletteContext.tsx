"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useAtom } from "jotai";
import { atom_commandUseCounts, atom_recentCommandIds } from "@/app/atoms/ui-atoms";

export type Command = {
  id: string;
  label: string;
  shortcut?: string;
  description?: string;
  category?: "Navigation" | "Document" | "Editor" | "Workspace" | "Vault" | "Tasks" | "Views" | "AI" | "Settings" | "Privacy" | "Help";
  keywords?: string | string[];
  disabledReason?: string;
  danger?: boolean;
  closeOnRun?: boolean;
  /** Where it takes you: another page of the app, or a new browser tab. The palette lists these apart, marked. */
  opens?: "page" | "tab";
  /** Close the palette (and let that paint) before running: for actions that open their own dialog or change the note. */
  closeFirst?: boolean;
  /** A menu: running it lists these in the palette instead of calling `action`. */
  subcommands?: Command[];
  action: () => unknown | Promise<unknown>;
};

type CommandPaletteContextValue = {
  isOpen: boolean;
  initialQuery: string;
  /** The menu command (`subcommands`) the palette opened into, if any. */
  initialMenuId: string | null;
  open: (initialQuery?: string) => void;
  /** Opens the palette on a menu command's list (e.g. Ctrl/Cmd+J's AI menu). */
  openMenu: (id: string) => void;
  close: () => void;
  commands: Command[];
  register: (command: Command) => () => void;
  recentCommandIds: string[];
  markUsed: (id: string) => void;
  /** Creates a note titled with the query; set by the editor while it's mounted. */
  createNote: ((title: string) => Promise<unknown>) | null;
  /** The current open/close went through a search-anchor morph (see morphWithAnchor). */
  isMorphing: boolean;
  setCreateNote: (handler: ((title: string) => Promise<unknown>) | null) => void;
};

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

// Shared-element name linking a search anchor (the toolbar's search
// pill) and the palette's search row, so opening and closing morph one into
// the other instead of showing two separate components.
export const PALETTE_SEARCH_TRANSITION = "palette-search";

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => Promise<void> | void) => {
    ready: Promise<void>;
    finished: Promise<void>;
    updateCallbackDone: Promise<void>;
  };
};

function canMorph(doc: ViewTransitionDocument) {
  return (
    typeof doc.startViewTransition === "function" &&
    // A hidden page can't run a view transition (InvalidStateError).
    !document.hidden &&
    !!document.querySelector("[data-palette-anchor]") &&
    !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

// The palette renders through a Portal (mounted by an effect) and keeps
// itself mounted briefly on close, so its search field appears/disappears a
// tick after the state change. The transition must not capture its "after"
// state before that, or the pill just fades instead of morphing.
async function waitForPaletteField(present: boolean, attempts = 20) {
  for (let i = 0; i < attempts; i++) {
    if (!!document.querySelector("[data-palette-field]") === present) return;
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState("");
  const [initialMenuId, setInitialMenuId] = useState<string | null>(null);
  const commandsRef = useRef<Map<string, Map<symbol, Command>>>(new Map());
  const [version, setVersion] = useState(0);
  const [recentCommandIds, setRecentCommandIds] = useAtom(atom_recentCommandIds);
  const [, setCommandUseCounts] = useAtom(atom_commandUseCounts);
  const [createNote, setCreateNoteState] = useState<((title: string) => Promise<unknown>) | null>(null);
  // Wrapped: a function passed to a state setter would be called as an updater.
  const setCreateNote = useCallback((handler: ((title: string) => Promise<unknown>) | null) => {
    setCreateNoteState(() => handler);
  }, []);

  const register = useCallback((command: Command) => {
    const registrationId = Symbol(command.id);
    const registrations = commandsRef.current.get(command.id) ?? new Map<symbol, Command>();
    registrations.set(registrationId, command);
    commandsRef.current.set(command.id, registrations);
    setVersion((v) => v + 1);
    return () => {
      const current = commandsRef.current.get(command.id);
      current?.delete(registrationId);
      if (current?.size === 0) commandsRef.current.delete(command.id);
      setVersion((v) => v + 1);
    };
  }, []);

  // Whether the current open (or close) went through a search-anchor morph.
  // The palette then skips its own enter/exit animations. It stays set for
  // as long as the palette is open: clearing it when the transition finished
  // would re-add the enter animation and replay the fade-in (a flicker).
  // Every open/close sets it afresh.
  const [isMorphing, setIsMorphing] = useState(false);

  // Runs `update` inside a view transition when a search anchor is on screen
  // (`[data-palette-anchor]`); otherwise, or without View Transitions support
  // or with reduced motion, it just runs it.
  const morphWithAnchor = useCallback((update: () => void, opening: boolean) => {
    const doc = document as ViewTransitionDocument;
    if (!canMorph(doc)) {
      setIsMorphing(false);
      update();
      return;
    }
    const transition = doc.startViewTransition!(async () => {
      flushSync(() => {
        setIsMorphing(true);
        update();
      });
      await waitForPaletteField(opening);
    });
    // The browser aborts the transition when the page is hidden mid-morph
    // (another tab or window): its promises reject, but the update still
    // runs, so there is nothing to recover; only the rejection is silenced.
    const ignore = () => {};
    transition.ready.catch(ignore);
    transition.finished.catch(ignore);
    transition.updateCallbackDone.catch(ignore);
  }, []);

  const open = useCallback((query: string = "") => {
    morphWithAnchor(() => {
      setInitialQuery(query);
      setInitialMenuId(null);
      setIsOpen(true);
    }, true);
  }, [morphWithAnchor]);
  const openMenu = useCallback((id: string) => {
    morphWithAnchor(() => {
      setInitialQuery("");
      setInitialMenuId(id);
      setIsOpen(true);
    }, true);
  }, [morphWithAnchor]);
  const close = useCallback(() => {
    morphWithAnchor(() => {
      setIsOpen(false);
      setInitialQuery("");
      setInitialMenuId(null);
    }, false);
  }, [morphWithAnchor]);

  const markUsed = useCallback((id: string) => {
    setRecentCommandIds((prev) => [id, ...prev.filter((existing) => existing !== id)].slice(0, 3));
    setCommandUseCounts((previous) => ({ ...previous, [id]: (previous[id] ?? 0) + 1 }));
  }, [setCommandUseCounts, setRecentCommandIds]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      // Alt combos belong to other shortcuts (Ctrl/Cmd+Alt+S shows the sidebar).
      const hasPrimaryModifier = (e.ctrlKey || e.metaKey) && !e.altKey;
      if (hasPrimaryModifier && e.shiftKey && (key === "k" || key === "p")) {
        e.preventDefault();
        open(">");
      } else if (hasPrimaryModifier && !e.shiftKey && (key === "k" || key === "p")) {
        e.preventDefault();
        open();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const commands = useMemo(
    () => {
      void version;
      return (
      Array.from(commandsRef.current.values())
        .map((registrations) => Array.from(registrations.values()).at(-1))
        .filter((command): command is Command => command !== undefined)
      );
    },
    [version],
  );

  const value = useMemo(
    () => ({ isOpen, initialQuery, initialMenuId, open, openMenu, close, commands, register, recentCommandIds, markUsed, createNote, isMorphing, setCreateNote }),
    [isOpen, initialQuery, initialMenuId, open, openMenu, close, commands, register, recentCommandIds, markUsed, createNote, isMorphing, setCreateNote],
  );

  return <CommandPaletteContext.Provider value={value}>{children}</CommandPaletteContext.Provider>;
}

export function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) throw new Error("useCommandPalette must be used within a CommandPaletteProvider");
  return ctx;
}

// For an entry point that can render outside the provider (a page under
// test): null there, where it then renders nothing.
export function useOptionalCommandPalette() {
  return useContext(CommandPaletteContext);
}

// Registers a command for the lifetime of the calling component. `command`
// is typically a fresh object every render (inline label/action closures
// over component state), so registration itself only keys off `id` — the
// Map stores a stable wrapper that reads through a ref, which is updated
// every render without an effect. This avoids re-registering (and looping)
// whenever the label or action identity changes.
export function useRegisterCommand(command: Command | null) {
  const { register } = useCommandPalette();
  const latest = useRef(command);
  latest.current = command;

  useEffect(() => {
    const id = latest.current?.id;
    if (!id) return;
    const stable: Command = {
      id,
      get label() { return latest.current?.label ?? ""; },
      get shortcut() { return latest.current?.shortcut; },
      get description() { return latest.current?.description; },
      get category() { return latest.current?.category; },
      get keywords() { return latest.current?.keywords; },
      get disabledReason() { return latest.current?.disabledReason; },
      get danger() { return latest.current?.danger; },
      get closeOnRun() { return latest.current?.closeOnRun; },
      get closeFirst() { return latest.current?.closeFirst; },
      get opens() { return latest.current?.opens; },
      get subcommands() { return latest.current?.subcommands; },
      action: (...args: Parameters<Command["action"]>) => latest.current?.action(...args),
    } as Command;
    return register(stable);
  }, [register, command?.id]);
}

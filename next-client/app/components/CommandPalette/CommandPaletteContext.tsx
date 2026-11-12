"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAtom } from "jotai";
import { atom_commandUseCounts, atom_recentCommandIds } from "@/app/atoms/ui-atoms";
import { startPerf } from "@/app/utils/perf/perf-metrics";
import { createDoubleShiftTracker } from "./palette-shortcuts";

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
  setCreateNote: (handler: ((title: string) => Promise<unknown>) | null) => void;
};

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

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

  const open = useCallback((query: string = "") => {
    startPerf("palette-open");
    setInitialQuery(query);
    setInitialMenuId(null);
    setIsOpen(true);
  }, []);
  const openMenu = useCallback((id: string) => {
    startPerf("palette-open");
    setInitialQuery("");
    setInitialMenuId(id);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => {
    setIsOpen(false);
    setInitialQuery("");
    setInitialMenuId(null);
  }, []);

  const markUsed = useCallback((id: string) => {
    setRecentCommandIds((prev) => [id, ...prev.filter((existing) => existing !== id)].slice(0, 3));
    setCommandUseCounts((previous) => ({ ...previous, [id]: (previous[id] ?? 0) + 1 }));
  }, [setCommandUseCounts, setRecentCommandIds]);

  // Read through a ref, so the key listeners below aren't re-bound on every
  // open/close, and a double-Shift while the palette is open is a no-op.
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  useEffect(() => {
    // Ctrl/Cmd+P is the quick switcher, Ctrl/Cmd+Shift+P the command
    // palette, and a double-Shift (below) the palette again. Mod-k binds
    // nothing: the key is left free, as in VS Code. Alt combos belong to
    // other shortcuts (Ctrl/Cmd+Alt+S shows the sidebar).
    const doubleShift = createDoubleShiftTracker(() => {
      if (!isOpenRef.current) open();
    });
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const hasPrimaryModifier = (e.ctrlKey || e.metaKey) && !e.altKey;
      if (hasPrimaryModifier && e.shiftKey && key === "p") {
        e.preventDefault();
        open(">");
      } else if (hasPrimaryModifier && key === "p") {
        e.preventDefault();
        open();
      }
      doubleShift.keydown(e);
    };
    const handleKeyUp = (e: KeyboardEvent) => doubleShift.keyup(e);
    // Capture phase: the editor handles its own input and may stop it there.
    const handleTextInput = () => doubleShift.textInput();
    const TEXT_EVENTS = ["beforeinput", "compositionstart", "compositionupdate"] as const;
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    TEXT_EVENTS.forEach((type) => document.addEventListener(type, handleTextInput, true));
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      TEXT_EVENTS.forEach((type) => document.removeEventListener(type, handleTextInput, true));
    };
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
    () => ({ isOpen, initialQuery, initialMenuId, open, openMenu, close, commands, register, recentCommandIds, markUsed, createNote, setCreateNote }),
    [isOpen, initialQuery, initialMenuId, open, openMenu, close, commands, register, recentCommandIds, markUsed, createNote, setCreateNote],
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

"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAtom } from "jotai";
import { atom_recentCommandIds } from "@/app/atoms/ui-atoms";

export type Command = {
  id: string;
  label: string;
  shortcut?: string;
  keywords?: string;
  action: () => void;
};

type CommandPaletteContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  commands: Command[];
  register: (command: Command) => () => void;
  recentCommandIds: string[];
  markUsed: (id: string) => void;
};

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const commandsRef = useRef<Map<string, Command>>(new Map());
  const [version, setVersion] = useState(0);
  const [recentCommandIds, setRecentCommandIds] = useAtom(atom_recentCommandIds);

  const register = useCallback((command: Command) => {
    commandsRef.current.set(command.id, command);
    setVersion((v) => v + 1);
    return () => {
      commandsRef.current.delete(command.id);
      setVersion((v) => v + 1);
    };
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const markUsed = useCallback((id: string) => {
    setRecentCommandIds((prev) => [id, ...prev.filter((existing) => existing !== id)].slice(0, 8));
  }, [setRecentCommandIds]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const commands = useMemo(() => Array.from(commandsRef.current.values()), [version]);

  const value = useMemo(
    () => ({ isOpen, open, close, commands, register, recentCommandIds, markUsed }),
    [isOpen, open, close, commands, register, recentCommandIds, markUsed],
  );

  return <CommandPaletteContext.Provider value={value}>{children}</CommandPaletteContext.Provider>;
}

export function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) throw new Error("useCommandPalette must be used within a CommandPaletteProvider");
  return ctx;
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
      get keywords() { return latest.current?.keywords; },
      action: (...args: Parameters<Command["action"]>) => latest.current?.action(...args),
    } as Command;
    return register(stable);
  }, [register, command?.id]);
}

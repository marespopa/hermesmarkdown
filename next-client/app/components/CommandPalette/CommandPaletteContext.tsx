"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAtom } from "jotai";
import { atom_recentCommandIds } from "@/app/atoms/ui-atoms";

export type Command = {
  id: string;
  label: string;
  shortcut?: string;
  description?: string;
  category?: "Navigation" | "Document" | "Editor" | "Workspace" | "Vault" | "Tasks" | "Views" | "AI" | "Voice" | "Settings" | "Help";
  keywords?: string | string[];
  disabledReason?: string;
  danger?: boolean;
  closeOnRun?: boolean;
  action: () => unknown | Promise<unknown>;
};

type CommandPaletteContextValue = {
  isOpen: boolean;
  initialQuery: string;
  open: (initialQuery?: string) => void;
  close: () => void;
  commands: Command[];
  register: (command: Command) => () => void;
  recentCommandIds: string[];
  markUsed: (id: string) => void;
};

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState("");
  const commandsRef = useRef<Map<string, Map<symbol, Command>>>(new Map());
  const [version, setVersion] = useState(0);
  const [recentCommandIds, setRecentCommandIds] = useAtom(atom_recentCommandIds);

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
    setInitialQuery(query);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => {
    setIsOpen(false);
    setInitialQuery("");
  }, []);

  const markUsed = useCallback((id: string) => {
    setRecentCommandIds((prev) => [id, ...prev.filter((existing) => existing !== id)].slice(0, 8));
  }, [setRecentCommandIds]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const hasPrimaryModifier = e.ctrlKey || e.metaKey;
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
    () => ({ isOpen, initialQuery, open, close, commands, register, recentCommandIds, markUsed }),
    [isOpen, initialQuery, open, close, commands, register, recentCommandIds, markUsed],
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
      get description() { return latest.current?.description; },
      get category() { return latest.current?.category; },
      get keywords() { return latest.current?.keywords; },
      get disabledReason() { return latest.current?.disabledReason; },
      get danger() { return latest.current?.danger; },
      get closeOnRun() { return latest.current?.closeOnRun; },
      action: (...args: Parameters<Command["action"]>) => latest.current?.action(...args),
    } as Command;
    return register(stable);
  }, [register, command?.id]);
}

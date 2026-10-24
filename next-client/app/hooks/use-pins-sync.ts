"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAtomValue, useStore } from "jotai";
import { selectAtom } from "jotai/utils";
import { atom_openFiles } from "@/app/atoms/file-atoms";
import { atom_pinsState, atom_updatePins, NO_PINS_STATE } from "@/app/atoms/pin-atoms";
import { atom_fileSystemVersion, atom_vaultHandle, atom_vaultKey } from "@/app/atoms/vault-atoms";
import { loadYaml, readPinsFile } from "@/app/services/vault-pins";
import { addPins, parsePins, PINS_PATH, samePins } from "@/app/services/vault-pins-format";
import { createFileObserver, type FileObserver } from "./file-system/file-observer";
import { cachePins, readCachedPins } from "./pins-cache";
import { forgetLegacyNotePins, readLegacyNotePins } from "./pins-migration";

// The open-file watcher's debounce (use-file-watcher.ts).
const OBSERVER_DEBOUNCE_MS = 250;

// The pins file's text as last saved in its own tab (Show Hidden Files), so
// saving it in the editor re-reads it; other tabs don't re-trigger.
const atom_pinsTabSaved = selectAtom(atom_openFiles, (files) => files[PINS_PATH]?.lastSavedContent);

// Keeps atom_pinsState equal to the open vault's `.hermes/pins.yaml`, and
// moves the vault's per-device pinned notes (pins-migration.ts) into it once
// per session. It reads the file when the vault opens, on every
// atom_fileSystemVersion bump (window focus, the rescan timers, the folder
// watcher, file operations, a GitHub Pull), when its tab is saved, and when a
// FileSystemObserver on the file reports a change (Chromium, once the file
// exists). An invalid file keeps the pins last read for this vault. Switching
// or closing the vault resets the pins first, to the ones this device last
// read for it (pins-cache.ts), so the sidebar shows them at once; every valid
// read is cached for next time. The YAML parser's chunk starts loading on
// mount, before the vault is even unlocked. Does nothing while disabled
// (the vault is locked).
export function usePinsSync(enabled: boolean): void {
  const store = useStore();
  const vault = useAtomValue(atom_vaultHandle);
  const vaultKey = useAtomValue(atom_vaultKey);
  const fileSystemVersion = useAtomValue(atom_fileSystemVersion);
  const tabSaved = useAtomValue(atom_pinsTabSaved);
  const runRef = useRef(0);
  const migratedRef = useRef(new Set<string>());
  const observerRef = useRef<FileObserver | null>(null);

  const migrate = useCallback(async (key: string) => {
    if (migratedRef.current.has(key)) return;
    migratedRef.current.add(key);
    const legacy = readLegacyNotePins(key);
    if (!legacy.length) return;
    const result = await store.set(atom_updatePins, (doc) => addPins(doc, legacy.map((target) => ({ kind: "note" as const, target }))));
    if (result === "ok" || result === "unchanged") forgetLegacyNotePins(key);
    // The file turned invalid meanwhile: try again on a later read.
    else if (result === "invalid") migratedRef.current.delete(key);
  }, [store]);

  const read = useCallback(async () => {
    if (!enabled) return;
    const run = ++runRef.current;
    if (!vault) {
      if (store.get(atom_pinsState) !== NO_PINS_STATE) store.set(atom_pinsState, NO_PINS_STATE);
      return;
    }
    const before = store.get(atom_pinsState);
    try {
      const [{ load }, file] = await Promise.all([loadYaml(), readPinsFile(vault)]);
      const current = store.get(atom_pinsState);
      // A later read, a vault change or one of the app's own writes landed first.
      if (run !== runRef.current || current.vault !== vault || current !== before) return;
      const parsed = parsePins(file?.text ?? "", load);
      if (!parsed.ok) {
        console.warn(`${PINS_PATH} isn't valid YAML; keeping the pins last read.`);
        if (current.status !== "invalid") store.set(atom_pinsState, { ...current, status: "invalid" });
        return;
      }
      if (file) observerRef.current?.sync(new Map([[PINS_PATH, file.handle]]));
      if (current.status !== "ok" || !samePins(current.pins, parsed.pins)) {
        store.set(atom_pinsState, { vault, status: "ok", pins: parsed.pins });
      }
      if (vaultKey) await migrate(vaultKey);
    } catch (err) {
      console.warn(`Couldn't read ${PINS_PATH}:`, err);
    }
  }, [enabled, vault, vaultKey, store, migrate]);

  // Starts fetching the parser now, so the first read doesn't wait for it.
  useEffect(() => {
    void loadYaml();
  }, []);

  // Remembers what was read, for the next time this vault opens.
  useEffect(() => store.sub(atom_pinsState, () => {
    const state = store.get(atom_pinsState);
    const key = store.get(atom_vaultKey);
    if (state.status === "ok" && key && state.vault === store.get(atom_vaultHandle)) cachePins(key, state.pins);
  }), [store]);

  const readRef = useRef(read);
  useEffect(() => {
    readRef.current = read;
  }, [read]);

  // A new vault (or none): start from no pins, and watch its file.
  useEffect(() => {
    if (!enabled) return;
    const current = store.get(atom_pinsState);
    if (!vault) {
      if (current !== NO_PINS_STATE) store.set(atom_pinsState, NO_PINS_STATE);
      return;
    }
    if (current.vault !== vault) {
      const key = store.get(atom_vaultKey);
      const cached = key ? readCachedPins(key) : null;
      store.set(atom_pinsState, { vault, status: "loading", pins: cached ?? [], cached: cached !== null });
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = createFileObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => void readRef.current(), OBSERVER_DEBOUNCE_MS);
    });
    observerRef.current = observer;
    return () => {
      clearTimeout(timer);
      observer?.disconnect();
      if (observerRef.current === observer) observerRef.current = null;
      // A read still in flight for this vault never lands.
      runRef.current++;
    };
  }, [enabled, vault, store]);

  useEffect(() => {
    void read();
  }, [read, fileSystemVersion, tabSaved]);
}

import type { FileState } from "../file-atoms";
import { clearRecoveryIssue, isQuotaError, reportRecoveryIssue } from "../recovery-atoms";
import { indexedDbBackend, isIndexedDbSupported, type NoteTextRecord, type OpenNotesBackend, type OpenNotesChanges } from "./open-notes-db";
import { debouncedJSONStorage } from "./legacy-storage";

// Keeps atom_openFiles in browser storage without blocking typing.
// - The text lives in IndexedDB (open-notes-db.ts), one record per note:
//   a write puts only the notes whose text or snapshots changed since the
//   last write, and never serializes the others.
// - The small part (path, file name, last modified time) stays in
//   localStorage["openNotes"], read at once on startup, so the shell and the
//   note's title show before the text arrives.
// - Writes wait for a pause in typing, then for the browser to be idle, and
//   go out at once when the page is hidden or closed.
// - The old single JSON value (localStorage["openFiles"]) is moved over once
//   and removed. Without IndexedDB (private mode, blocked) it stays the store,
//   as before, with its storage-full warning.

type OpenFiles = Record<string, FileState>;

export const LEGACY_KEY = "openFiles";
export const META_KEY = "openNotes";
const WRITE_DELAY_MS = 300;
const IDLE_TIMEOUT_MS = 1000;

interface NoteMeta {
  fileName: string;
  activeFilePath: string | null;
  lastModified?: number;
}

export interface PersisterStart {
  /** What to show at once: every note (old storage) or each note without its text; null for nothing stored. */
  files: OpenFiles | null;
  /** The notes with their text, when `files` lacks it; null when IndexedDB can't be read. */
  load: Promise<OpenFiles | null> | null;
}

interface MetaStorage {
  get(): string | null;
  set(value: string): void;
}

const localMeta: MetaStorage = {
  get: () => localStorage.getItem(META_KEY),
  set: (value) => localStorage.setItem(META_KEY, value),
};

type LegacyStorage = ReturnType<typeof debouncedJSONStorage<OpenFiles | null>>;

const textChanged = (a: FileState, b: FileState) =>
  a.content !== b.content || a.lastSavedContent !== b.lastSavedContent || a.conflict !== b.conflict;
const metaChanged = (a: FileState, b: FileState) =>
  a.fileName !== b.fileName || a.activeFilePath !== b.activeFilePath || a.lastModified !== b.lastModified;

function toTextRecord(state: FileState): NoteTextRecord {
  return {
    content: state.content,
    ...(state.lastSavedContent !== state.content ? { lastSavedContent: state.lastSavedContent } : {}),
    ...(state.conflict ? { conflict: state.conflict } : {}),
  };
}

function toMeta(files: OpenFiles): Record<string, NoteMeta> {
  const meta: Record<string, NoteMeta> = {};
  for (const [path, state] of Object.entries(files)) {
    meta[path] = {
      fileName: state.fileName,
      activeFilePath: state.activeFilePath,
      ...(state.lastModified !== undefined ? { lastModified: state.lastModified } : {}),
    };
  }
  return meta;
}

const placeholder = (meta: NoteMeta): FileState => ({ content: "", lastSavedContent: "", ...meta });

export class OpenNotesPersister {
  private mode: "idb" | "legacy" = "legacy";
  private ready = true;
  private readyWaiters: (() => void)[] = [];
  private started: PersisterStart | null = null;
  /** The value as last written; changes are found against it. */
  private persisted: OpenFiles = {};
  private latest: OpenFiles | null = null;
  private pendingText = new Set<string>();
  private pendingSnapshots = new Set<string>();
  private metaDirty = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private idleId: number | undefined;

  constructor(
    private readonly backend: OpenNotesBackend | null,
    private readonly legacy: LegacyStorage,
    private readonly meta: MetaStorage,
  ) {}

  /** Reads what's stored. The old storage is read afresh each time; IndexedDB once. */
  start(): PersisterStart {
    if (this.started) return this.started;
    const legacyValue = this.legacy.getItem(LEGACY_KEY, null);
    if (!this.backend) {
      this.mode = "legacy";
      return { files: legacyValue, load: null };
    }
    if (legacyValue) {
      this.mode = "legacy";
      this.latest = legacyValue;
      void this.migrate(legacyValue);
      return { files: legacyValue, load: null };
    }
    this.mode = "idb";
    const meta = this.readMeta();
    if (!meta) {
      this.started = { files: null, load: null };
      return this.started;
    }
    const placeholders: OpenFiles = {};
    for (const [path, entry] of Object.entries(meta)) placeholders[path] = placeholder(entry);
    this.persisted = placeholders;
    this.ready = false;
    const load = this.backend.load().then(
      ({ texts, snapshots }) => {
        const files: OpenFiles = {};
        for (const [path, entry] of Object.entries(meta)) {
          const text = texts[path];
          files[path] = {
            ...placeholder(entry),
            content: text?.content ?? "",
            lastSavedContent: text?.lastSavedContent ?? text?.content ?? "",
            ...(text?.conflict ? { conflict: text.conflict } : {}),
            ...(snapshots[path]?.length ? { snapshots: snapshots[path] } : {}),
          };
        }
        // Records left by notes closed before their delete landed.
        for (const path of Object.keys(texts)) if (!meta[path]) this.pendingText.add(path);
        for (const path of Object.keys(snapshots)) if (!meta[path]) this.pendingSnapshots.add(path);
        return files;
      },
      (err) => {
        console.warn("Open files: IndexedDB unavailable, keeping them in localStorage:", err);
        this.mode = "legacy";
        return null;
      },
    );
    this.started = { files: placeholders, load };
    return this.started;
  }

  /**
   * The stored notes reached the atom as `files`. Notes in `touched` changed
   * before they arrived (their stored record is stale), so they are written.
   */
  hydrated(files: OpenFiles, touched: readonly string[]): void {
    const persisted = { ...this.persisted };
    for (const [path, state] of Object.entries(files)) persisted[path] = state;
    for (const path of touched) delete persisted[path];
    this.persisted = persisted;
    this.ready = true;
    for (const resolve of this.readyWaiters.splice(0)) resolve();
    this.change(files);
  }

  isReady = () => this.ready;

  /** Resolves once the stored notes have their text (at once when they already do). */
  whenReady(): Promise<void> {
    return this.ready ? Promise.resolve() : new Promise((resolve) => this.readyWaiters.push(resolve));
  }

  /** The open notes changed: schedule writing what differs. */
  change(next: OpenFiles): void {
    this.latest = next;
    if (this.mode === "legacy") {
      this.legacy.setItem(LEGACY_KEY, next);
      return;
    }
    const prev = this.persisted;
    for (const [path, state] of Object.entries(next)) {
      const before = prev[path];
      if (before === state) {
        this.pendingText.delete(path);
        this.pendingSnapshots.delete(path);
        continue;
      }
      if (!before || textChanged(before, state)) this.pendingText.add(path);
      else this.pendingText.delete(path);
      if (!before || before.snapshots !== state.snapshots) this.pendingSnapshots.add(path);
      else this.pendingSnapshots.delete(path);
      if (!before || metaChanged(before, state)) this.metaDirty = true;
    }
    for (const path of Object.keys(prev)) {
      if (path in next) continue;
      this.pendingText.add(path);
      this.pendingSnapshots.add(path);
      this.metaDirty = true;
    }
    if (this.hasPending()) this.schedule();
  }

  /** Writes what's pending now (page hidden or closed). */
  flush(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.cancelIdle();
    if (this.mode !== "idb" || !this.ready || !this.latest || !this.backend) return;
    const latest = this.latest;
    const changes: OpenNotesChanges = { texts: {}, snapshots: {} };
    for (const path of this.pendingText) changes.texts[path] = latest[path] ? toTextRecord(latest[path]) : null;
    for (const path of this.pendingSnapshots) changes.snapshots[path] = latest[path]?.snapshots?.length ? latest[path].snapshots! : null;
    const writeMeta = this.metaDirty;
    this.pendingText.clear();
    this.pendingSnapshots.clear();
    this.metaDirty = false;
    this.persisted = latest;
    if (writeMeta) this.writeMeta(latest);
    if (Object.keys(changes.texts).length === 0 && Object.keys(changes.snapshots).length === 0) return;
    this.backend.write(changes).then(
      () => clearRecoveryIssue("storage-full"),
      (err) => this.writeFailed(err, changes),
    );
  }

  private hasPending() {
    return this.pendingText.size > 0 || this.pendingSnapshots.size > 0 || this.metaDirty;
  }

  // Waits for a pause in typing (each change restarts it), then for idle time.
  private schedule() {
    if (!this.ready) return;
    clearTimeout(this.timer);
    this.cancelIdle();
    this.timer = setTimeout(() => {
      this.timer = undefined;
      if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
        this.idleId = window.requestIdleCallback(() => {
          this.idleId = undefined;
          this.flush();
        }, { timeout: IDLE_TIMEOUT_MS });
      } else {
        this.flush();
      }
    }, WRITE_DELAY_MS);
  }

  private cancelIdle() {
    if (this.idleId !== undefined && typeof window !== "undefined") window.cancelIdleCallback?.(this.idleId);
    this.idleId = undefined;
  }

  private writeFailed(err: unknown, changes: OpenNotesChanges) {
    if (isQuotaError(err)) {
      // The notes stay in memory; the next change writes these again.
      const persisted = { ...this.persisted };
      for (const path of [...Object.keys(changes.texts), ...Object.keys(changes.snapshots)]) delete persisted[path];
      this.persisted = persisted;
      reportRecoveryIssue({ kind: "storage-full" });
      return;
    }
    console.warn("Open files: IndexedDB write failed, keeping them in localStorage:", err);
    this.mode = "legacy";
    if (this.latest) this.legacy.setItem(LEGACY_KEY, this.latest);
  }

  private writeMeta(files: OpenFiles) {
    try {
      this.meta.set(JSON.stringify(toMeta(files)));
    } catch (err) {
      if (!isQuotaError(err)) throw err;
      reportRecoveryIssue({ kind: "storage-full" });
    }
  }

  private readMeta(): Record<string, NoteMeta> | null {
    try {
      const raw = this.meta.get();
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }

  // Moves the old single value into IndexedDB, then drops it. Edits made
  // meanwhile went to the old storage and are written again from `latest`.
  private async migrate(value: OpenFiles) {
    const changes: OpenNotesChanges = { texts: {}, snapshots: {} };
    for (const [path, state] of Object.entries(value)) {
      changes.texts[path] = toTextRecord(state);
      if (state.snapshots?.length) changes.snapshots[path] = state.snapshots;
    }
    try {
      await this.backend!.write(changes);
    } catch (err) {
      console.warn("Open files: couldn't move them to IndexedDB, keeping localStorage:", err);
      return;
    }
    this.writeMeta(value);
    this.legacy.removeItem(LEGACY_KEY);
    this.mode = "idb";
    this.persisted = value;
    if (this.latest) this.change(this.latest);
  }
}

const legacyStorage: LegacyStorage = debouncedJSONStorage<OpenFiles | null>();

export const openNotesPersister = new OpenNotesPersister(isIndexedDbSupported() ? indexedDbBackend : null, legacyStorage, localMeta);

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => openNotesPersister.flush());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") openNotesPersister.flush();
  });
}

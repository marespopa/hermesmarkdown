// Reads and writes the vault's pins file, `.hermesmarkdown/pins.yaml` (the format is
// vault-pins-format.ts). Every backend has the same handle API (a local
// folder, a browser vault, a GitHub vault's workspace, which commits
// `.hermesmarkdown/**` on its next sync). Writes are serialised in one promise chain
// and always start from a fresh read of the file, so two quick actions never
// lose each other's change, and an invalid (or newer) file is never
// overwritten. js-yaml loads lazily, from a local chunk.
import { ensureVaultFolder } from "@/app/hooks/file-system/unique-file";
import { withRetry } from "@/app/hooks/file-system/shared";
import { writeFileContent } from "./file-writer";
import {
  listedPins,
  parsePins,
  PINS_FILE,
  PINS_FOLDER,
  serializePins,
  type Pin,
  type PinsDocument,
  type YamlDump,
  type YamlLoad,
} from "./vault-pins-format";

export class PinsFileInvalidError extends Error {
  constructor() {
    super(`${PINS_FOLDER}/${PINS_FILE} isn't valid YAML`);
    this.name = "PinsFileInvalidError";
  }
}

export class PinsFileNewerError extends Error {
  constructor() {
    super(`${PINS_FOLDER}/${PINS_FILE} was saved by a newer version`);
    this.name = "PinsFileNewerError";
  }
}

let yaml: Promise<{ load: YamlLoad; dump: YamlDump }> | null = null;
export function loadYaml(): Promise<{ load: YamlLoad; dump: YamlDump }> {
  yaml ??= import("js-yaml").then((module) => ({ load: module.load as YamlLoad, dump: module.dump as YamlDump }));
  return yaml;
}

// The file's text and a fresh handle; null without `.hermesmarkdown/` or the file.
export async function readPinsFile(
  vault: FileSystemDirectoryHandle,
): Promise<{ text: string; handle: FileSystemFileHandle } | null> {
  try {
    const folder = await vault.getDirectoryHandle(PINS_FOLDER);
    const handle = await folder.getFileHandle(PINS_FILE);
    const text = await (await handle.getFile()).text();
    return { text, handle };
  } catch (err) {
    const name = (err as { name?: string } | null)?.name;
    if (name === "NotFoundError" || name === "TypeMismatchError") return null;
    throw err;
  }
}

async function applyEdit(
  vault: FileSystemDirectoryHandle,
  edit: (doc: PinsDocument, pins: Pin[]) => PinsDocument | null,
): Promise<{ pins: Pin[]; changed: boolean }> {
  const { load, dump } = await loadYaml();
  const file = await readPinsFile(vault);
  const parsed = parsePins(file?.text ?? "", load);
  if (!parsed.ok) throw new PinsFileInvalidError();
  if (parsed.newer) throw new PinsFileNewerError();
  const next = edit(parsed.doc, parsed.pins);
  if (!next) return { pins: parsed.pins, changed: false };
  const folder = await ensureVaultFolder(vault, PINS_FOLDER);
  const handle = await withRetry(() => folder.getFileHandle(PINS_FILE, { create: true }));
  await withRetry(() => writeFileContent(handle, serializePins(next, dump)));
  return { pins: listedPins(next), changed: true };
}

let chain: Promise<unknown> = Promise.resolve();

// Read fresh → parse → edit → write, one at a time. Throws
// PinsFileInvalidError / PinsFileNewerError (nothing written); resolves to
// the listed pins after the edit, and whether the file changed.
export function updatePinsFile(
  vault: FileSystemDirectoryHandle,
  edit: (doc: PinsDocument, pins: Pin[]) => PinsDocument | null,
): Promise<{ pins: Pin[]; changed: boolean }> {
  const run = chain.then(() => applyEdit(vault, edit));
  chain = run.catch(() => {});
  return run;
}

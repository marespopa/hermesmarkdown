export async function writeHermesFile(
  vaultHandle: FileSystemDirectoryHandle,
  filename: string,
  content: string,
): Promise<void> {
  const hermesDir = await vaultHandle.getDirectoryHandle(".hermes", { create: true });
  let fileHandle = await hermesDir.getFileHandle(filename, { create: true });
  let writable;
  try {
    writable = await fileHandle.createWritable();
  } catch (err: any) {
    if (err.name === "InvalidStateError") {
      fileHandle = await hermesDir.getFileHandle(filename, { create: true });
      writable = await fileHandle.createWritable();
    } else {
      throw err;
    }
  }
  await writable.write(content);
  await writable.close();
}

const VOICE_MD_SCAFFOLD = "## Audience\n\n\n## Tone\n\n\n## Recurring themes\n\n\n## Avoid\n\n";

/**
 * Opens `.hermes/voice.md` if it already exists, or creates it from a blank
 * scaffold and opens that. Shared by the Settings page button and the
 * command palette entry so both go through one code path.
 */
export async function openOrCreateVoiceMd(params: {
  vaultHandle: FileSystemDirectoryHandle | null | undefined;
  openFile: (fileHandle: any, providedPath?: string, force?: boolean) => Promise<void>;
}): Promise<{ opened: boolean }> {
  const { vaultHandle, openFile } = params;

  if (!vaultHandle) throw new Error("Open a vault first.");
  const hermesDir = await vaultHandle.getDirectoryHandle(".hermes", { create: true });
  let existingHandle: FileSystemFileHandle | null = null;
  try {
    existingHandle = await hermesDir.getFileHandle("voice.md");
  } catch {
    // doesn't exist yet — fine
  }
  if (existingHandle) {
    await openFile(existingHandle, ".hermes/voice.md", true);
    return { opened: true };
  }
  await writeHermesFile(vaultHandle, "voice.md", VOICE_MD_SCAFFOLD);
  const fileHandle = await hermesDir.getFileHandle("voice.md");
  await openFile(fileHandle, ".hermes/voice.md", true);
  return { opened: false };
}

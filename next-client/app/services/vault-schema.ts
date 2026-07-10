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

export async function findDriveHermesFile(folderId: string, filename: string): Promise<{ id: string } | null> {
  try {
    const { listFiles, FOLDER_MIME } = await import("./drive/client");
    const { files: rootFiles } = await listFiles(folderId);
    const hermesFolder = rootFiles.find(f => f.mimeType === FOLDER_MIME && f.name === ".hermes");
    if (!hermesFolder) return null;
    const { files: hermesFiles } = await listFiles(hermesFolder.id);
    const file = hermesFiles.find(f => f.name === filename);
    return file ? { id: file.id } : null;
  } catch {
    return null;
  }
}

export async function readDriveHermesFile(folderId: string, filename: string): Promise<string | null> {
  try {
    const { listFiles, getFileContent, FOLDER_MIME } = await import("./drive/client");
    const { files: rootFiles } = await listFiles(folderId);
    const hermesFolder = rootFiles.find(f => f.mimeType === FOLDER_MIME && f.name === ".hermes");
    if (!hermesFolder) return null;
    const { files: hermesFiles } = await listFiles(hermesFolder.id);
    const file = hermesFiles.find(f => f.name === filename);
    if (!file) return null;
    return await getFileContent(file.id);
  } catch {
    return null;
  }
}

// Drive allows duplicate names in one parent, so — as with the index.yaml and
// installVaultFiles fixes elsewhere — this lists the parent live and takes
// the oldest match instead of trusting a cached path index, self-healing any
// duplicate files left over from a previous check-then-create race.
export async function writeDriveHermesFile(
  folderId: string,
  filename: string,
  content: string,
): Promise<{ id: string }> {
  const { listFiles, createFile, updateFile, createFolder, deleteFile, FOLDER_MIME } = await import("./drive/client");
  const { files: rootFiles } = await listFiles(folderId);
  const hermesFolders = rootFiles.filter(f => f.mimeType === FOLDER_MIME && f.name === ".hermes");
  const hermesFolder = hermesFolders[0] ?? (await createFolder(".hermes", folderId));

  const { files: hermesFiles } = await listFiles(hermesFolder.id);
  const existing = hermesFiles.filter(f => f.name === filename).sort((a, b) => a.id.localeCompare(b.id));
  if (existing.length > 0) {
    await updateFile(existing[0].id, content);
    for (const dupe of existing.slice(1)) {
      try {
        await deleteFile(dupe.id);
      } catch {
        // best-effort cleanup — leaving a stale duplicate is harmless
      }
    }
    return { id: existing[0].id };
  }
  const created = await createFile(filename, hermesFolder.id, content);
  return { id: created.id };
}

const VOICE_MD_SCAFFOLD = "## Audience\n\n\n## Tone\n\n\n## Recurring themes\n\n\n## Avoid\n\n";

/**
 * Opens `.hermes/voice.md` if it already exists, or creates it from a blank
 * scaffold and opens that. Shared by the Settings page button and the
 * command palette entry so both go through one code path.
 */
export async function openOrCreateVoiceMd(params: {
  vaultHandle: FileSystemDirectoryHandle | null | undefined;
  isDriveVault: boolean;
  driveVaultId: string | null | undefined;
  openFile: (fileHandle: any, providedPath?: string, force?: boolean) => Promise<void>;
}): Promise<{ opened: boolean }> {
  const { vaultHandle, isDriveVault, driveVaultId, openFile } = params;

  if (isDriveVault && driveVaultId) {
    const { DriveFileHandle } = await import("./drive/DriveFileHandle");
    const existing = await findDriveHermesFile(driveVaultId, "voice.md");
    if (existing) {
      const fileHandle = new DriveFileHandle("voice.md", existing.id);
      await openFile(fileHandle, ".hermes/voice.md", true);
      return { opened: true };
    }
    const driveFile = await writeDriveHermesFile(driveVaultId, "voice.md", VOICE_MD_SCAFFOLD);
    const fileHandle = new DriveFileHandle("voice.md", driveFile.id);
    await openFile(fileHandle, ".hermes/voice.md", true);
    return { opened: false };
  }

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

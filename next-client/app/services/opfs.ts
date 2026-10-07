// Origin Private File System helpers shared by the vault kinds that live in
// browser storage (browser vaults and GitHub vault workspaces). Both keep
// their files under `hermes-vaults/` so the rest of the app can treat them
// like any other FileSystemDirectoryHandle.

export const BROWSER_VAULT_DESCRIPTOR_VERSION = 1;
const VAULTS_DIRECTORY = "hermes-vaults";
const BROWSER_VAULT_PREFIX = "browser-";

export interface BrowserVaultDescriptor {
  version: typeof BROWSER_VAULT_DESCRIPTOR_VERSION;
  kind: "browser";
  id: string;
  displayName: string;
  createdAt: number;
  /** When the vault was last exported as a backup, if ever. */
  lastExportedAt?: number;
}

export interface StorageStatus {
  usage: number | null;
  quota: number | null;
  persisted: boolean;
}

export function isOpfsSupported(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.storage?.getDirectory === "function";
}

export async function getStorageRoot(): Promise<FileSystemDirectoryHandle> {
  if (!isOpfsSupported()) {
    throw new Error("Origin Private File System is not supported by this browser.");
  }
  return navigator.storage.getDirectory();
}

export async function getVaultsDirectory(): Promise<FileSystemDirectoryHandle> {
  const root = await getStorageRoot();
  return root.getDirectoryHandle(VAULTS_DIRECTORY, { create: true });
}

export function isBrowserVaultId(id: string): boolean {
  return /^[a-z0-9-]{1,64}$/.test(id);
}

export function isBrowserVaultDescriptor(value: any): value is BrowserVaultDescriptor {
  return !!value &&
    value.version === BROWSER_VAULT_DESCRIPTOR_VERSION &&
    value.kind === "browser" &&
    typeof value.id === "string" && isBrowserVaultId(value.id) &&
    typeof value.displayName === "string" &&
    typeof value.createdAt === "number" &&
    (value.lastExportedAt === undefined || typeof value.lastExportedAt === "number");
}

const BACKUP_REMINDER_MS = 14 * 24 * 60 * 60 * 1000;

// A browser vault only lives in this browser's storage; nudge for a backup
// once it is two weeks past its creation or its last export.
export function isBrowserVaultBackupDue(descriptor: BrowserVaultDescriptor, now = Date.now()): boolean {
  return now - (descriptor.lastExportedAt ?? descriptor.createdAt) > BACKUP_REMINDER_MS;
}

// A browser vault's display name: trimmed, required, at most 100 characters.
export function normalizeBrowserVaultName(displayName: string): string {
  const name = displayName.trim();
  if (!name) throw new Error("A vault name is required.");
  return name.slice(0, 100);
}

export function createBrowserVaultDescriptor(displayName: string): BrowserVaultDescriptor {
  const name = normalizeBrowserVaultName(displayName);
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return {
    version: BROWSER_VAULT_DESCRIPTOR_VERSION,
    kind: "browser",
    id: random.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 36),
    displayName: name,
    createdAt: Date.now(),
  };
}

export async function getBrowserVaultWorkspace(
  descriptor: Pick<BrowserVaultDescriptor, "id">,
): Promise<FileSystemDirectoryHandle> {
  if (!isBrowserVaultId(descriptor.id)) throw new Error("Browser vault id is invalid.");
  const vaults = await getVaultsDirectory();
  return vaults.getDirectoryHandle(`${BROWSER_VAULT_PREFIX}${descriptor.id}`, { create: true });
}

// Ids of the browser vault folders that exist in storage right now.
export async function listBrowserVaultIds(): Promise<string[]> {
  if (!isOpfsSupported()) return [];
  const vaults = await getVaultsDirectory();
  const ids: string[] = [];
  for await (const entry of (vaults as any).values()) {
    if (entry.kind === "directory" && entry.name.startsWith(BROWSER_VAULT_PREFIX)) {
      ids.push(entry.name.slice(BROWSER_VAULT_PREFIX.length));
    }
  }
  return ids;
}

export async function deleteBrowserVaultWorkspace(id: string): Promise<void> {
  if (!isBrowserVaultId(id)) throw new Error("Browser vault id is invalid.");
  const vaults = await getVaultsDirectory();
  try {
    await vaults.removeEntry(`${BROWSER_VAULT_PREFIX}${id}`, { recursive: true });
  } catch (caught) {
    if (!(caught instanceof DOMException) || caught.name !== "NotFoundError") throw caught;
  }
}

// Asks the browser not to evict site data under storage pressure (Safari
// otherwise clears it after a stretch without use). Resolves to whether
// storage is persisted afterwards; never throws.
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function getStorageStatus(): Promise<StorageStatus> {
  try {
    const estimate = await navigator.storage?.estimate?.();
    const persisted = (await navigator.storage?.persisted?.()) ?? false;
    return {
      usage: estimate?.usage ?? null,
      quota: estimate?.quota ?? null,
      persisted,
    };
  } catch {
    return { usage: null, quota: null, persisted: false };
  }
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

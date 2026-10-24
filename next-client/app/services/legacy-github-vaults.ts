// GitHub vaults were removed (git now happens outside the browser). Their
// notes still sit in browser storage, so each one this device knew about
// (the last-opened vault and the recents list) becomes an ordinary browser
// vault with the same name and files, once. The old folder and keys are
// removed only after the copy is registered, so an interrupted run loses
// nothing (at worst it copies again next start).
import { copyInto } from "@/app/hooks/file-system/directory-ops";
import { deleteKeys, listKeys, readKey, registerBrowserVault, saveBrowserVaultDescriptor, writeKey } from "./idb";
import { RECENT_VAULTS_KEY } from "./recent-vaults";
import {
  createBrowserVaultDescriptor,
  getBrowserVaultWorkspace,
  getVaultsDirectory,
  isOpfsSupported,
  type BrowserVaultDescriptor,
} from "./opfs";

const KEY_LAST_GITHUB_VAULT = "lastGithubVault";
const KEY_GITHUB_MANIFEST_PREFIX = "githubManifest:";

interface LegacyGitHubDescriptor {
  kind: "github";
  repositoryId: number;
  branch: string;
  displayName: string;
}

function isLegacyDescriptor(value: any): value is LegacyGitHubDescriptor {
  return !!value && value.kind === "github" && Number.isSafeInteger(value.repositoryId) &&
    typeof value.branch === "string" && !!value.branch && typeof value.displayName === "string";
}

// The OPFS folder a GitHub vault's files were mirrored into.
export function legacyWorkspaceName(descriptor: Pick<LegacyGitHubDescriptor, "repositoryId" | "branch">): string {
  return `${descriptor.repositoryId}-${encodeURIComponent(descriptor.branch)}`;
}

async function getExistingDirectory(parent: FileSystemDirectoryHandle, name: string) {
  try {
    return await parent.getDirectoryHandle(name);
  } catch {
    return null;
  }
}

export async function migrateLegacyGitHubVaults(): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB || !isOpfsSupported()) return;
  try {
    const keys = await listKeys();
    const last = keys.includes(KEY_LAST_GITHUB_VAULT) ? await readKey<unknown>(KEY_LAST_GITHUB_VAULT) : undefined;
    const recents = await readKey<unknown>(RECENT_VAULTS_KEY);
    const recentList: any[] = Array.isArray(recents) ? recents : [];
    const legacy = [last, ...recentList.map((entry) => entry?.kind === "github" ? entry.descriptor : null)]
      .filter(isLegacyDescriptor);
    const manifestKeys = keys.filter((key) => key.startsWith(KEY_GITHUB_MANIFEST_PREFIX));
    if (!legacy.length && !manifestKeys.length && !keys.includes(KEY_LAST_GITHUB_VAULT)) return;

    const vaults = await getVaultsDirectory();
    const migrated = new Map<string, BrowserVaultDescriptor>();
    for (const descriptor of legacy) {
      const folder = legacyWorkspaceName(descriptor);
      if (migrated.has(folder)) continue;
      const source = await getExistingDirectory(vaults, folder);
      if (!source) continue;
      const target = createBrowserVaultDescriptor(descriptor.displayName || "GitHub vault");
      await copyInto(source, await getBrowserVaultWorkspace(target));
      migrated.set(folder, target);
    }

    // Register every copy; the one that was open last is saved last so it is
    // the vault restored now.
    const lastFolder = isLegacyDescriptor(last) ? legacyWorkspaceName(last) : null;
    for (const [folder, target] of migrated) {
      if (folder !== lastFolder) await registerBrowserVault(target);
    }
    const lastTarget = lastFolder ? migrated.get(lastFolder) : undefined;
    if (lastTarget) await saveBrowserVaultDescriptor(lastTarget);

    await writeKey(RECENT_VAULTS_KEY, recentList.flatMap((entry) => {
      if (entry?.kind !== "github") return [entry];
      const target = isLegacyDescriptor(entry.descriptor) ? migrated.get(legacyWorkspaceName(entry.descriptor)) : undefined;
      return target ? [{ ...entry, key: `browser:${target.id}`, kind: "browser", name: target.displayName, descriptor: target }] : [];
    }));
    for (const folder of migrated.keys()) await vaults.removeEntry(folder, { recursive: true });
    await deleteKeys([KEY_LAST_GITHUB_VAULT, ...manifestKeys]);
  } catch (err) {
    console.warn("Failed to convert GitHub vaults to browser vaults:", err);
  }
}

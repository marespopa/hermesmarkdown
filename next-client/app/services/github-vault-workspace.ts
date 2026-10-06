import { isTrashPath } from "./vault-trash";
import { getVaultsDirectory } from "./opfs";
import { writeFileContent } from "./file-writer";

export const GITHUB_VAULT_DESCRIPTOR_VERSION = 1;
export const GITHUB_VAULT_MANIFEST_VERSION = 1;

export interface GitHubVaultDescriptor {
  version: typeof GITHUB_VAULT_DESCRIPTOR_VERSION;
  kind: "github";
  repositoryId: number;
  owner: string;
  repository: string;
  branch: string;
  displayName: string;
  baseHeadSha: string | null;
}

export interface GitHubVaultManifestEntry {
  blobSha: string;
}

export interface GitHubVaultManifest {
  version: typeof GITHUB_VAULT_MANIFEST_VERSION;
  baseHeadSha: string | null;
  entries: Record<string, GitHubVaultManifestEntry>;
  pendingSyncOperationId: string | null;
}

export interface GitHubVaultRemoteFile {
  path: string;
  content: string;
  blobSha: string;
}

const RESERVED_SEGMENTS = new Set([".", "..", ".git"]);
const IGNORED_DIRECTORY_NAMES = new Set([".git", "node_modules", "vendor"]);

type GitHubVaultFileEntry = {
  kind: "file";
  name: string;
  getFile(): Promise<{ text(): Promise<string> }>;
};
type GitHubVaultDirectoryEntry = {
  kind: "directory";
  name: string;
  values(): AsyncIterable<GitHubVaultEntry>;
};
type GitHubVaultEntry = GitHubVaultFileEntry | GitHubVaultDirectoryEntry;
type GitHubVaultDirectory = {
  values(): AsyncIterable<GitHubVaultEntry>;
};

export function isGitHubVaultIgnoredDirectory(name: string): boolean {
  return IGNORED_DIRECTORY_NAMES.has(name);
}

export function normalizeGitHubVaultPath(path: string): string {
  if (!path || path.includes("\\") || path.startsWith("/") || path.endsWith("/")) {
    throw new Error("GitHub vault paths must be non-empty relative paths.");
  }

  const segments = path.split("/");
  if (segments.some((segment) => !segment || RESERVED_SEGMENTS.has(segment))) {
    throw new Error("GitHub vault paths cannot contain traversal or .git segments.");
  }

  return segments.join("/");
}

export function isGitHubVaultPathAllowed(path: string): boolean {
  const normalized = normalizeGitHubVaultPath(path);
  if (isTrashPath(normalized)) return false;
  return normalized.endsWith(".md") || normalized.startsWith(".hermes/");
}

export function getGitHubVaultWorkspaceName(descriptor: Pick<GitHubVaultDescriptor, "repositoryId" | "branch">): string {
  if (!Number.isSafeInteger(descriptor.repositoryId) || descriptor.repositoryId <= 0 || !descriptor.branch) {
    throw new Error("GitHub vault descriptor has an invalid repository or branch.");
  }
  return `${descriptor.repositoryId}-${encodeURIComponent(descriptor.branch)}`;
}

export function createGitHubVaultManifest(baseHeadSha: string | null = null): GitHubVaultManifest {
  return {
    version: GITHUB_VAULT_MANIFEST_VERSION,
    baseHeadSha,
    entries: {},
    pendingSyncOperationId: null,
  };
}

export function createGitHubVaultManifestFromFiles(
  baseHeadSha: string | null,
  files: readonly GitHubVaultRemoteFile[],
): GitHubVaultManifest {
  const manifest = createGitHubVaultManifest(baseHeadSha);
  for (const file of files) {
    manifest.entries[normalizeGitHubVaultPath(file.path)] = { blobSha: file.blobSha };
  }
  return manifest;
}

export async function getGitHubVaultWorkspace(
  descriptor: Pick<GitHubVaultDescriptor, "repositoryId" | "branch">,
): Promise<FileSystemDirectoryHandle> {
  const vaults = await getVaultsDirectory();
  return vaults.getDirectoryHandle(getGitHubVaultWorkspaceName(descriptor), { create: true });
}

async function getDirectoryForPath(
  root: FileSystemDirectoryHandle,
  path: string,
): Promise<{ directory: FileSystemDirectoryHandle; filename: string }> {
  const segments = normalizeGitHubVaultPath(path).split("/");
  const filename = segments.pop();
  if (!filename) throw new Error("A file path is required.");

  let directory = root;
  for (const segment of segments) {
    directory = await directory.getDirectoryHandle(segment, { create: true });
  }
  return { directory, filename };
}

export async function writeGitHubVaultFile(
  workspace: FileSystemDirectoryHandle,
  path: string,
  content: string,
): Promise<void> {
  if (!isGitHubVaultPathAllowed(path)) {
    throw new Error(`Unsupported GitHub vault path: ${path}`);
  }
  const { directory, filename } = await getDirectoryForPath(workspace, path);
  await writeFileContent(await directory.getFileHandle(filename, { create: true }), content);
}

export async function deleteGitHubVaultFile(
  workspace: FileSystemDirectoryHandle,
  path: string,
): Promise<void> {
  const { directory, filename } = await getDirectoryForPath(workspace, path);
  try {
    await directory.removeEntry(filename);
  } catch (caught) {
    if (!(caught instanceof DOMException) || caught.name !== "NotFoundError") throw caught;
  }
}

export async function materializeGitHubVault(
  descriptor: Pick<GitHubVaultDescriptor, "repositoryId" | "branch">,
  files: readonly GitHubVaultRemoteFile[],
): Promise<FileSystemDirectoryHandle> {
  const workspace = await getGitHubVaultWorkspace(descriptor);

  for (const remoteFile of files) {
    if (!isGitHubVaultPathAllowed(remoteFile.path)) {
      throw new Error(`Unsupported GitHub vault path: ${remoteFile.path}`);
    }
    await writeGitHubVaultFile(workspace, remoteFile.path, remoteFile.content);
  }

  return workspace;
}

export async function readGitHubVaultFiles(
  root: GitHubVaultDirectory,
): Promise<{ path: string; content: string }[]> {
  const files: { path: string; content: string }[] = [];

  async function visit(directory: GitHubVaultDirectory, parent = ""): Promise<void> {
    for await (const entry of directory.values()) {
      const path = parent ? `${parent}/${entry.name}` : entry.name;
      if (entry.kind === "directory") {
        if (isGitHubVaultIgnoredDirectory(entry.name)) continue;
        await visit(entry, path);
      } else if (isGitHubVaultPathAllowed(path)) {
        files.push({ path, content: await (await entry.getFile()).text() });
      }
    }
  }

  await visit(root);
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

export async function getGitHubBlobSha(content: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Secure browser cryptography is required to sync a GitHub vault.");
  }
  const contentBytes = new TextEncoder().encode(content);
  const header = new TextEncoder().encode(`blob ${contentBytes.byteLength}\0`);
  const payload = new Uint8Array(header.byteLength + contentBytes.byteLength);
  payload.set(header);
  payload.set(contentBytes, header.byteLength);
  const digest = await globalThis.crypto.subtle.digest("SHA-1", payload);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

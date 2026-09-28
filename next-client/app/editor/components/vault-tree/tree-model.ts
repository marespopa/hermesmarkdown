// Below this count, plain rendering is simpler and avoids virtualizer
// scroll-restoration quirks (e.g. jumping while resizing); above it, an
// un-virtualized list of vault-scale (or larger) file counts would mean
// one DOM node per file, which is the actual performance cliff.
export const VIRTUALIZE_THRESHOLD = 200;

export interface VaultFileTreeProps {
  processedFiles: any[];
  activeFilePath: string | null;
  openFile: (handle: FileSystemFileHandle, path?: string) => void;
  openFileInPane?: (handle: FileSystemFileHandle, path?: string) => void;
  renameFile: (handle: FileSystemHandle) => void | Promise<void>;
  deleteFile: (handle: FileSystemHandle, path?: string) => void;
  duplicateFile?: (handle: FileSystemHandle) => void;
  onClose?: () => void;
  isSearchActive?: boolean;
  highlightQuery?: string;
  treeView?: boolean;
  folderPaths?: string[];
  // Tree-only: folders are inferred from paths, so folder actions need a way
  // to resolve a real FileSystemDirectoryHandle.
  resolveFolderHandle?: (path: string) => Promise<any | null>;
  createNewFile?: (targetDirectory?: FileSystemDirectoryHandle) => void | Promise<unknown>;
  createFolder?: (parentDirectory?: FileSystemDirectoryHandle) => Promise<FileSystemDirectoryHandle | null>;
  moveItem?: (handle: any, targetDir: any) => void;
}

export interface DraggedEntry {
  kind: "file" | "folder";
  path: string;
  name: string;
  handle?: any;
}

export interface TreeFolderNode {
  type: "folder";
  name: string;
  path: string;
  children: TreeNode[];
}

interface TreeFileNode {
  type: "file";
  name: string;
  path: string;
  entry: any;
}

export type TreeNode = TreeFolderNode | TreeFileNode;

export function buildFileTree(files: any[], folderPaths: string[]): TreeNode[] {
  const root: TreeFolderNode = { type: "folder", name: "", path: "", children: [] };
  const folderByPath = new Map<string, TreeFolderNode>([["", root]]);

  const ensureFolder = (path: string) => {
    const segments = path.split("/");
    let parentPath = "";
    let parent = root;
    for (const segment of segments) {
      const folderPath = parentPath ? `${parentPath}/${segment}` : segment;
      let folder = folderByPath.get(folderPath);
      if (!folder) {
        folder = { type: "folder", name: segment, path: folderPath, children: [] };
        folderByPath.set(folderPath, folder);
        parent.children.push(folder);
      }
      parent = folder;
      parentPath = folderPath;
    }
    return parent;
  };

  for (const folderPath of folderPaths) {
    ensureFolder(folderPath);
  }

  for (const entry of files) {
    const path: string = getEntryPath(entry) || entry.name;
    const segments = path.split("/");
    const fileName = segments.pop()!;
    const parent = ensureFolder(segments.join("/"));

    parent.children.push({ type: "file", name: fileName, path, entry });
  }

  const sortChildren = (node: TreeFolderNode) => {
    node.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const child of node.children) {
      if (child.type === "folder") sortChildren(child);
    }
  };
  sortChildren(root);

  return root.children;
}

export function getEntryPath(entry: any): string | undefined {
  return entry.path as string | undefined;
}

export function getEntryId(entry: any): string {
  return getEntryPath(entry) || entry.name;
}

export function isDescendantOrSelf(ancestorPath: string, path: string): boolean {
  return path === ancestorPath || path.startsWith(`${ancestorPath}/`);
}

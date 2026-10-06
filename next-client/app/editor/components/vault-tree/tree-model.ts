// Below this count, plain rendering is simpler and avoids virtualizer
// scroll-restoration quirks (e.g. jumping while resizing); above it, an
// un-virtualized list of vault-scale (or larger) file counts would mean
// one DOM node per file, which is the actual performance cliff.
export const VIRTUALIZE_THRESHOLD = 200;

// What the tree's hosts can ask of it (Explorer / sidebar / mobile buttons):
// start naming a new note or folder in place. Without `parentPath`, it goes
// in the selected folder (or the selected item's folder, else the root).
export interface VaultFileTreeController {
  startCreate: (kind: "file" | "folder", parentPath?: string) => void;
}

export interface VaultFileTreeProps {
  processedFiles: any[];
  activeFilePath: string | null;
  openFile: (handle: FileSystemFileHandle, path?: string) => void;
  openFileInPane?: (handle: FileSystemFileHandle, path?: string) => void;
  // Resolves to the new vault path when it renamed (the inline name field
  // selects the renamed row).
  renameFile: (handle: FileSystemHandle, newName?: string, path?: string) => unknown;
  deleteFile: (handle: FileSystemHandle, path?: string) => unknown;
  // Moves several items to the Trash as one action (one toast, one Undo);
  // without it, each selected item goes through `deleteFile`.
  trashItems?: (items: { handle: FileSystemHandle; path?: string }[]) => unknown;
  // Moves several items as one action; without it, `moveItem` per item.
  moveItems?: (handles: any[], targetDir: any) => unknown;
  // ⌘Z / Ctrl+Z while the tree has focus.
  undoFileOperation?: () => unknown;
  controllerRef?: React.MutableRefObject<VaultFileTreeController | null>;
  duplicateFile?: (handle: FileSystemHandle) => void;
  onClose?: () => void;
  // Open files on a single click (sidebar); otherwise double-click opens.
  singleClickOpen?: boolean;
  isSearchActive?: boolean;
  highlightQuery?: string;
  treeView?: boolean;
  // Tree only: list-view column header plus Date Modified / Kind columns
  // (the Explorer page).
  columns?: boolean;
  folderPaths?: string[];
  // Tree-only: folders are inferred from paths, so folder actions need a way
  // to resolve a real FileSystemDirectoryHandle.
  resolveFolderHandle?: (path: string) => Promise<any | null>;
  // With a name (typed in the tree's inline field) they don't prompt.
  createNewFile?: (targetDirectory?: FileSystemDirectoryHandle, name?: string) => void | Promise<unknown>;
  createFolder?: (parentDirectory?: FileSystemDirectoryHandle, name?: string) => Promise<FileSystemDirectoryHandle | null>;
  moveItem?: (handle: any, targetDir: any) => void;
}

export interface DraggedEntry {
  kind: "file" | "folder";
  path: string;
  name: string;
  handle?: any;
  // Dragging one of several selected items drags them all (this one included).
  group?: DraggedEntry[];
}

// A row as shown, top to bottom (children of collapsed folders left out):
// the order arrow keys and shift-click ranges follow.
export interface VisibleRow {
  path: string;
  type: "file" | "folder";
  depth: number;
  node: TreeNode;
}

export function flattenVisible(nodes: TreeNode[], isCollapsed: (path: string) => boolean, depth = 0): VisibleRow[] {
  const rows: VisibleRow[] = [];
  for (const node of nodes) {
    rows.push({ path: node.path, type: node.type, depth, node });
    if (node.type === "folder" && !isCollapsed(node.path)) {
      rows.push(...flattenVisible(node.children, isCollapsed, depth + 1));
    }
  }
  return rows;
}

// Every ancestor folder of `path`, outermost first.
export function ancestorPaths(path: string): string[] {
  const segments = path.split("/").slice(0, -1);
  return segments.map((_, i) => segments.slice(0, i + 1).join("/"));
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

export function parentFolderPath(path: string): string {
  return path.split("/").slice(0, -1).join("/");
}

// Whether `entry` may be moved into the folder at `targetPath` ("" = vault
// root): not into itself or its own subtree, and not where it already is.
// For a group: no folder into itself, and at least one item not there yet
// (items already in the target just stay).
export function canDropInto(entry: DraggedEntry | null, targetPath: string): entry is DraggedEntry {
  if (!entry) return false;
  const items = entry.group ?? [entry];
  return (
    !items.some((item) => item.kind === "folder" && isDescendantOrSelf(item.path, targetPath)) &&
    items.some((item) => parentFolderPath(item.path) !== targetPath)
  );
}

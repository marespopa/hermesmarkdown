export type PaneDirection = "horizontal" | "vertical";

export type PaneType = "editor" | "preview" | "metrics";

export type DockZone = "top" | "bottom" | "left" | "right" | "center";

// Bumped when the stored shape changes; a missing version marks a legacy
// layout (see atoms/layout-normalize.ts).
export const WORKSPACE_LAYOUT_VERSION = 2;

export interface PanelLeaf {
  id: string; // Unique pane identifier
  type: PaneType;
  activeFilePath?: string;
  openFilePaths: string[]; // List of files open in this pane (tabs)
  // Open paths by when they were last viewed, most recent last; decides which
  // tab closes first at the tab limit (atoms/tab-limit.ts).
  recentFilePaths?: string[];
  isPinned: boolean;
}

export interface WorkspaceContainer {
  id: string;
  direction: PaneDirection;
  sizes: number[]; // Percentage distribution, e.g., [40, 60]
  children: (WorkspaceContainer | PanelLeaf)[];
  // Keeps the two panes of this split scrolled together; only meaningful with
  // exactly two leaf children.
  scrollLock?: boolean;
}

export interface WorkspaceState {
  version?: number;
  rootContainer: WorkspaceContainer | PanelLeaf;
}

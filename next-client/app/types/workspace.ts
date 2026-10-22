// Bumped when the stored shape changes; an older or missing version marks a
// legacy layout (see atoms/layout-normalize.ts).
export const WORKSPACE_LAYOUT_VERSION = 3;

// The editor's one pane: its open notes (tabs) and the one in front.
export interface PanelLeaf {
  id: string; // Unique pane identifier
  activeFilePath?: string;
  openFilePaths: string[]; // List of files open in this pane (tabs)
  // Open paths by when they were last viewed, most recent last; decides which
  // tab closes first at the tab limit (atoms/tab-limit.ts).
  recentFilePaths?: string[];
  isPinned: boolean;
}

export interface WorkspaceState {
  version?: number;
  rootContainer: PanelLeaf;
}

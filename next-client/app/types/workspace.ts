export type PaneDirection = "horizontal" | "vertical";

export interface PanelLeaf {
  id: string; // Unique pane identifier
  type: "editor" | "preview" | "metrics";
  activeFilePath?: string;
  openFilePaths: string[]; // List of files open in this pane (tabs)
  isPinned: boolean;
}

export interface WorkspaceContainer {
  id: string;
  direction: PaneDirection;
  sizes: number[]; // Percentage distribution, e.g., [40, 60]
  children: (WorkspaceContainer | PanelLeaf)[];
}

export interface WorkspaceState {
  rootContainer: WorkspaceContainer | PanelLeaf;
}

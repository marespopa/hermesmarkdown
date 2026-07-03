import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { WorkspaceQuery } from "../utils/queryEngine";
import { TaskItem } from "../utils/taskExtractor";
import { TokenEstimate } from "../utils/tokenEstimate";

export interface FileMetadata {
  path: string;
  name: string;
  tags: string[];
  links: string[]; // Paths or names this file links to [[Link]]
  frontmatter: Record<string, any>;
  modifiedAt: number;
  wordCount: number;
  tasks: TaskItem[];
  handle: any; // FileSystemFileHandle | DriveFileHandle
  tokens: TokenEstimate;
  agentScore: { score: number; label: string } | null;
}

export const atom_fileMetadata = atom<Record<string, FileMetadata>>({});

export interface CustomWorkspace {
  id: string;
  name: string;
  icon: string; // Lucide or Heroicon identifier
  query: WorkspaceQuery;
}

export const atom_customWorkspaces = atomWithStorage<CustomWorkspace[]>(
  "customWorkspaces",
  [],
);

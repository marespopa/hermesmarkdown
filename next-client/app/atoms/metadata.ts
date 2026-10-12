import { atom } from "jotai";
import { TaskItem } from "../utils/taskExtractor";

export interface FileMetadata {
  path: string;
  name: string;
  tags: string[];
  links: string[]; // Paths or names this file links to [[Link]]
  frontmatter: Record<string, any>;
  modifiedAt: number;
  wordCount: number;
  tasks: TaskItem[];
  /** Plain-text excerpt for note lists; absent until the worker has read the file. */
  preview?: string;
  handle: any; // FileSystemFileHandle
}

export const atom_fileMetadata = atom<Record<string, FileMetadata>>({});


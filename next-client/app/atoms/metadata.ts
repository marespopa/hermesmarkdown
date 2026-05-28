import { atom } from "jotai";

export interface FileMetadata {
  path: string;
  name: string;
  tags: string[];
  frontmatter: Record<string, any>;
  modifiedAt: number;
  wordCount: number;
  handle: FileSystemFileHandle;
}

export const atom_fileMetadata = atom<Record<string, FileMetadata>>({});

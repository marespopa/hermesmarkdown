"use client";

import React from "react";
import { useAtom } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { evaluateQuery, WorkspaceQuery } from "@/app/utils/queryEngine";
import { HiOutlineDocumentText, HiOutlineClock, HiOutlineClipboardList, HiOutlineArchive } from "react-icons/hi";

interface SmartFolderConfig {
  name: string;
  icon: React.ReactNode;
  query: WorkspaceQuery;
}

const DEFAULT_SMART_FOLDERS: SmartFolderConfig[] = [
  {
    name: "Today's Work",
    icon: <HiOutlineClock size={16} />,
    query: {
      operator: "AND",
      rules: [{ field: "modifiedAt", condition: "after-days", value: 1 }],
    },
  },
  {
    name: "Review Pending",
    icon: <HiOutlineClipboardList size={16} />,
    query: {
      operator: "OR",
      rules: [
        { field: "tags", condition: "includes", value: "#todo" },
        { field: "tags", condition: "includes", value: "#review" },
      ],
    },
  },
  {
    name: "Stale Logs",
    icon: <HiOutlineArchive size={16} />,
    query: {
      operator: "AND",
      rules: [{ field: "modifiedAt", condition: "before-days", value: 30 }],
    },
  },
];

interface SmartFoldersProps {
  onFileSelect: (handle: FileSystemFileHandle, path?: string) => void;
  activeFileHandle?: FileSystemFileHandle | null;
}

export default function SmartFolders({ onFileSelect, activeFileHandle }: SmartFoldersProps) {
  const [fileMetadata] = useAtom(atom_fileMetadata);
  const [selectedFolder, setSelectedFolder] = React.useState<string | null>(null);

  const matchedFiles = React.useMemo(() => {
    if (!selectedFolder) return [];
    const config = DEFAULT_SMART_FOLDERS.find((f) => f.name === selectedFolder);
    if (!config) return [];

    return Object.values(fileMetadata).filter((meta) =>
      evaluateQuery(meta, config.query)
    );
  }, [selectedFolder, fileMetadata]);

  return (
    <div className="space-y-1">
      <h3 className="px-3 text-[9px] uppercase tracking-[0.2em] font-bold opacity-30 py-2">
        Workspaces
      </h3>
      <div className="px-2 space-y-0.5">
        {DEFAULT_SMART_FOLDERS.map((folder) => (
          <div key={folder.name}>
            <div
              onClick={() => setSelectedFolder(selectedFolder === folder.name ? null : folder.name)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-colors text-xs ${
                selectedFolder === folder.name
                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium"
                  : "hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
              }`}
            >
              <span className="opacity-70">{folder.icon}</span>
              <span className="truncate">{folder.name}</span>
            </div>
            
            {selectedFolder === folder.name && (
              <div className="ml-4 mt-1 border-l border-neutral-200 dark:border-neutral-800 space-y-0.5 pl-2 mb-2 animate-in fade-in slide-in-from-top-1 duration-200">
                {matchedFiles.map((file) => (
                  <div
                    key={file.path}
                    onClick={() => onFileSelect(file.handle, file.path)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-colors text-[11px] truncate ${
                      activeFileHandle?.name === file.name
                        ? "text-blue-600 dark:text-blue-400 font-medium"
                        : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                    }`}
                  >
                    <HiOutlineDocumentText size={14} className="shrink-0 opacity-50" />
                    <span className="truncate">{file.name}</span>
                  </div>
                ))}
                {matchedFiles.length === 0 && (
                  <div className="px-3 py-2 text-[10px] italic opacity-30">
                    No matches
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

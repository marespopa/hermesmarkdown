"use client";

import React from "react";
import { useAtom } from "jotai";
import { atom_fileMetadata, atom_customWorkspaces, CustomWorkspace } from "@/app/atoms/metadata";
import { evaluateQuery, WorkspaceQuery } from "@/app/utils/queryEngine";
import { HiOutlineDocumentText, HiOutlineClock, HiOutlineClipboardList, HiOutlineArchive, HiOutlinePlus, HiOutlineDotsVertical, HiOutlinePencil, HiOutlineTrash, HiOutlineCollection } from "react-icons/hi";
import Button from "@/app/components/Button";
import WorkspaceBuilder from "./WorkspaceBuilder";
import { useDialog } from "@/app/hooks/use-dialog";

interface SmartFolderConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  query: WorkspaceQuery;
  isDefault?: boolean;
}

const DEFAULT_SMART_FOLDERS: SmartFolderConfig[] = [
  {
    id: "today",
    name: "Today's Work",
    icon: <HiOutlineClock size={16} />,
    query: {
      operator: "AND",
      rules: [{ field: "modifiedAt", condition: "after-days", value: 1 }],
    },
    isDefault: true,
  },
  {
    id: "review",
    name: "Review Pending",
    icon: <HiOutlineClipboardList size={16} />,
    query: {
      operator: "OR",
      rules: [
        { field: "tags", condition: "includes", value: "#todo" },
        { field: "tags", condition: "includes", value: "#review" },
      ],
    },
    isDefault: true,
  },
  {
    id: "stale",
    name: "Stale Logs",
    icon: <HiOutlineArchive size={16} />,
    query: {
      operator: "AND",
      rules: [{ field: "modifiedAt", condition: "before-days", value: 30 }],
    },
    isDefault: true,
  },
];

interface SmartFoldersProps {
  onFileSelect: (handle: FileSystemFileHandle, path?: string) => void;
  activeFileHandle?: FileSystemFileHandle | null;
}

export default function SmartFolders({ onFileSelect, activeFileHandle }: SmartFoldersProps) {
  const [fileMetadata] = useAtom(atom_fileMetadata);
  const [customWorkspaces, setCustomWorkspaces] = useAtom(atom_customWorkspaces);
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null);
  const [actionMenuId, setActionMenuId] = React.useState<string | null>(null);
  const [isBuilderOpen, setIsBuilderOpen] = React.useState(false);
  const [editingWorkspace, setEditingWorkspace] = React.useState<CustomWorkspace | null>(null);
  const dialog = useDialog();

  const allWorkspaces = React.useMemo(() => {
    const customConverted: SmartFolderConfig[] = customWorkspaces.map(cw => ({
      id: cw.id,
      name: cw.name,
      icon: <HiOutlineCollection size={16} />, // Default icon for custom
      query: cw.query,
    }));
    return [...DEFAULT_SMART_FOLDERS, ...customConverted];
  }, [customWorkspaces]);

  const matchedFiles = React.useMemo(() => {
    if (!selectedFolderId) return [];
    const config = allWorkspaces.find((f) => f.id === selectedFolderId);
    if (!config) return [];

    return Object.values(fileMetadata).filter((meta) =>
      evaluateQuery(meta, config.query, fileMetadata)
    );
  }, [selectedFolderId, fileMetadata, allWorkspaces]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await dialog.confirm(
      "Are you sure you want to delete this workspace?",
      "Delete Workspace",
    );
    if (confirmed) {
      setCustomWorkspaces((prev) => prev.filter((w) => w.id !== id));
      if (selectedFolderId === id) setSelectedFolderId(null);
    }
    setActionMenuId(null);
  };

  const handleEdit = (workspaceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ws = customWorkspaces.find(w => w.id === workspaceId);
    if (ws) {
      setEditingWorkspace(ws);
      setIsBuilderOpen(true);
    }
    setActionMenuId(null);
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center px-3 py-2">
        <h3 className="text-[9px] uppercase tracking-[0.2em] font-bold opacity-30">
          Workspaces
        </h3>
        <Button
          variant="icon"
          className="w-5 h-5 opacity-30 hover:opacity-100"
          onClick={() => {
            setEditingWorkspace(null);
            setIsBuilderOpen(true);
          }}
          title="Add Custom Workspace"
        >
          <HiOutlinePlus size={12} />
        </Button>
      </div>

      <div className="px-2 space-y-0.5">
        {allWorkspaces.map((folder) => (
          <div key={folder.id} className="group relative">
            <div
              onClick={() => setSelectedFolderId(selectedFolderId === folder.id ? null : folder.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-colors text-xs pr-8 ${
                selectedFolderId === folder.id
                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium"
                  : "hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
              }`}
            >
              <span className="opacity-70">{folder.icon}</span>
              <span className="truncate">{folder.name}</span>
            </div>

            {!folder.isDefault && (
              <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="icon"
                  className="w-6 h-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActionMenuId(actionMenuId === folder.id ? null : folder.id);
                  }}
                >
                  <HiOutlineDotsVertical size={12} className="opacity-60" />
                </Button>
              </div>
            )}

            {actionMenuId === folder.id && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setActionMenuId(null)} />
                <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl py-1 min-w-[100px] animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={(e) => handleEdit(folder.id, e)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[10px] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <HiOutlinePencil size={12} className="opacity-60" />
                    Edit
                  </button>
                  <button
                    onClick={(e) => handleDelete(folder.id, e)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[10px] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-red-500"
                  >
                    <HiOutlineTrash size={12} className="opacity-60" />
                    Delete
                  </button>
                </div>
              </>
            )}
            
            {selectedFolderId === folder.id && (
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

      <WorkspaceBuilder
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        editingWorkspace={editingWorkspace}
      />
    </div>
  );
}

"use client";

import React from "react";
import { useAtom, useAtomValue } from "jotai";
import { atom_fileMetadata, atom_customWorkspaces, CustomWorkspace } from "@/app/atoms/metadata";
import { evaluateQuery, WorkspaceQuery } from "@/app/utils/queryEngine";
import { HiOutlineDocumentText, HiOutlineClock, HiOutlinePlus, HiOutlineDotsVertical, HiOutlinePencil, HiOutlineTrash, HiOutlineCollection } from "react-icons/hi";
import Button from "@/app/components/Button";
import WorkspaceBuilder from "./WorkspaceBuilder";
import { useDialog } from "@/app/hooks/use-dialog";
import { atom_activeFilePath } from "@/app/atoms/atoms";

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
];

interface SmartFoldersProps {
  onFileSelect: (handle: FileSystemFileHandle, path?: string) => void;
  renameFile: (handle: FileSystemHandle) => void;
  deleteFile: (handle: FileSystemHandle) => void;
  searchQuery?: string;
  selectedTags?: string[];
  onMatchCountChange?: (count: number, hasFolderSelected: boolean) => void;
}

export default function SmartFolders({
  onFileSelect,
  renameFile,
  deleteFile,
  searchQuery = "",
  selectedTags = [],
  onMatchCountChange,
}: SmartFoldersProps) {
  const [fileMetadata] = useAtom(atom_fileMetadata);
  const [customWorkspaces, setCustomWorkspaces] = useAtom(atom_customWorkspaces);
  const activeFilePath = useAtomValue(atom_activeFilePath);
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = React.useState<{ x: number, y: number, id: string } | null>(null);
  const [fileActionMenuOpen, setFileActionMenuOpen] = React.useState<{ x: number, y: number, path: string } | null>(null);
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
    return [...customConverted, ...DEFAULT_SMART_FOLDERS];
  }, [customWorkspaces]);

  const matchedFiles = React.useMemo(() => {
    if (!selectedFolderId) return [];
    const config = allWorkspaces.find((f) => f.id === selectedFolderId);
    if (!config) return [];

    let files = Object.values(fileMetadata).filter((meta) =>
      evaluateQuery(meta, config.query, fileMetadata)
    );

    // Apply sidebar search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      files = files.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.path.toLowerCase().includes(q)
      );
    }

    if (selectedTags.length > 0) {
      files = files.filter(f =>
        selectedTags.every(t => f.tags.includes(t))
      );
    }

    return files;
  }, [selectedFolderId, fileMetadata, allWorkspaces, searchQuery, selectedTags]);

  React.useEffect(() => {
    onMatchCountChange?.(matchedFiles.length, selectedFolderId !== null);
  }, [matchedFiles.length, selectedFolderId, onMatchCountChange]);

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
    setActionMenuOpen(null);
  };

  const handleEdit = (workspaceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ws = customWorkspaces.find(w => w.id === workspaceId);
    if (ws) {
      setEditingWorkspace(ws);
      setIsBuilderOpen(true);
    }
    setActionMenuOpen(null);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex justify-between items-center px-4 py-2 shrink-0">
        <span className="text-ui-caption font-semibold uppercase tracking-wider text-stone dark:text-fg-faint">
          Your Views
        </span>
        <Button
          variant="icon"
          className="w-6 h-6 opacity-80 hover:opacity-100 text-ink-muted dark:text-stone"
          onClick={() => {
            setEditingWorkspace(null);
            setIsBuilderOpen(true);
          }}
          title="Create New View"
          aria-label="Create New View"
        >
          <HiOutlinePlus size={14} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-0.5 px-2 pb-2 custom-scrollbar">
        {allWorkspaces.map((folder) => {
          const isSelected = selectedFolderId === folder.id;
          return (
            <div key={folder.id} className="group">
              <div className="relative">
                <div
                  onClick={() => setSelectedFolderId(isSelected ? null : folder.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all text-ui-subhead pr-8 relative ${
                    isSelected
                      ? "text-sage dark:text-sage font-medium before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-sage bg-sage/10"
                      : "hover:bg-paper-softgray dark:hover:bg-paper-dark-surface text-ink-muted dark:text-stone font-medium"
                  }`}
                >
                  <span className="opacity-70">{folder.icon}</span>
                  <span className="truncate">{folder.name}</span>
                </div>

                {!folder.isDefault && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity z-10">
                    <Button
                      variant="icon"
                      className="w-7 h-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (actionMenuOpen?.id === folder.id) {
                          setActionMenuOpen(null);
                        } else {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setActionMenuOpen({ 
                            x: rect.right, 
                            y: rect.bottom > window.innerHeight - 120 ? rect.top - 100 : rect.bottom + 4,
                            id: folder.id 
                          });
                        }
                      }}
                      title="View options"
                      aria-label="View options"
                    >
                      <HiOutlineDotsVertical size={14} className="opacity-80" />
                    </Button>
                  </div>
                )}

                {actionMenuOpen?.id === folder.id && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setActionMenuOpen(null)} />
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="fixed z-50 bg-paper-light dark:bg-paper-dark backdrop-blur-xl border border-edge-subtle rounded-xl shadow-xl py-1 min-w-[120px] animate-in fade-in zoom-in-95 duration-100"
                      style={{ top: actionMenuOpen.y, left: actionMenuOpen.x - 120 }}
                    >
                      <Button
                        variant="menu-item"
                        onClick={(e) => handleEdit(folder.id, e)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-ui-footnote font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <HiOutlinePencil size={14} className="opacity-80" />
                        Edit
                      </Button>
                      <Button
                        variant="menu-item"
                        onClick={(e) => handleDelete(folder.id, e)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-ui-footnote font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-red-500"
                      >
                        <HiOutlineTrash size={14} className="opacity-80" />
                        Delete
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {isSelected && (
                <div className="ml-5 mt-1 border-l border-edge space-y-0.5 pl-3 mb-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  {matchedFiles.map((file) => (
                    <div
                      key={file.path}
                      className="group/file relative"
                    >
                      <div
                        onClick={() => onFileSelect(file.handle, file.path)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-all text-ui-caption truncate pr-8 relative ${
                          activeFilePath === file.path
                            ? "text-sage dark:text-sage font-bold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-sage bg-sage/10"
                            : "text-ink-muted hover:text-ink-light dark:hover:text-ink-dark font-medium hover:bg-paper-softgray dark:hover:bg-paper-dark-surface/50"
                        }`}
                      >
                        <HiOutlineDocumentText size={14} className="shrink-0 opacity-50" />
                        <span className="truncate">{file.name}</span>
                      </div>

                      <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/file:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity z-10">
                        <Button
                          variant="icon"
                          className="w-6 h-6"
                          title="File options"
                          aria-label="File options"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (fileActionMenuOpen?.path === file.path) {
                              setFileActionMenuOpen(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setFileActionMenuOpen({ 
                                x: rect.right, 
                                y: rect.bottom > window.innerHeight - 120 ? rect.top - 100 : rect.bottom + 4,
                                path: file.path 
                              });
                            }
                          }}
                        >
                          <HiOutlineDotsVertical size={12} className="opacity-80" />
                        </Button>
                      </div>

                      {fileActionMenuOpen?.path === file.path && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setFileActionMenuOpen(null)} />
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="fixed z-50 bg-paper-light dark:bg-paper-dark backdrop-blur-xl border border-edge-subtle rounded-xl shadow-xl py-1 min-w-[120px] animate-in fade-in zoom-in-95 duration-100"
                            style={{ top: fileActionMenuOpen.y, left: fileActionMenuOpen.x - 120 }}
                          >
                            <Button
                              variant="menu-item"
                              onClick={(e) => { e.stopPropagation(); renameFile(file.handle); setFileActionMenuOpen(null); }}
                              className="w-full flex items-center gap-3 px-4 py-2 text-ui-footnote font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                            >
                              <HiOutlinePencil size={12} className="opacity-80" />
                              Rename
                            </Button>
                            <Button
                              variant="menu-item"
                              onClick={(e) => { e.stopPropagation(); deleteFile(file.handle); setFileActionMenuOpen(null); }}
                              className="w-full flex items-center gap-3 px-4 py-2 text-ui-footnote font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-red-500"
                            >
                              <HiOutlineTrash size={12} className="opacity-80" />
                              Delete
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {matchedFiles.length === 0 && (
                    <div className="px-3 py-2 text-ui-footnote italic opacity-40">
                      No matching files
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <WorkspaceBuilder
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        editingWorkspace={editingWorkspace}
      />
    </div>
  );
}

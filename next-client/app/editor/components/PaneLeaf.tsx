"use client";

import React from "react";
import { PanelLeaf } from "@/app/types/workspace";
import MarkdownEditor from "./MarkdownEditor";
import { useAtom } from "jotai";
import { 
  atom_activePaneId, 
  atom_fileContent, 
  atom_openFiles, 
  atom_splitPane, 
  atom_closePane, 
  atom_closeTab, 
  atom_activeFilePath, 
  atom_moveTab, 
  atom_isZenModeActive, 
  atom_saveStatus,
  atom_liveHandles,
  atom_autosaveMode,
  contentStore
} from "@/app/atoms/atoms";
import { HiOutlineDocumentText, HiOutlineEye, HiOutlineChartBar, HiOutlineX, HiOutlineSave } from "react-icons/hi";
import { VscSplitHorizontal, VscClose } from "react-icons/vsc";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useAtomValue } from "jotai";

interface PaneLeafProps {
  leaf: PanelLeaf;
}

export default function PaneLeaf({ leaf }: PaneLeafProps) {
  const [activePaneId, setActivePaneId] = useAtom(atom_activePaneId);
  const [openFiles] = useAtom(atom_openFiles);
  const [, splitPane] = useAtom(atom_splitPane);
  const [, closePane] = useAtom(atom_closePane);
  const [, closeTab] = useAtom(atom_closeTab);
  const [, setActiveFilePath] = useAtom(atom_activeFilePath);
  const [, moveTab] = useAtom(atom_moveTab);
  const [isZenModeActive] = useAtom(atom_isZenModeActive);
  const saveStatus = useAtomValue(atom_saveStatus);

  const { openFileByName, saveFile, exportFile } = useFileSystem();
  const filePath = leaf.activeFilePath || "draft";
  const [content, setContent] = useAtom(atom_fileContent(filePath));
  const liveHandle = useAtomValue(atom_liveHandles(filePath));
  
  const isActive = activePaneId === leaf.id;

  const handleExport = async () => {
    if (!content.trim()) return;
    const fileState = openFiles[filePath];
    const fileName = fileState?.fileName || "Untitled";

    if (liveHandle) {
      const success = await saveFile(content, liveHandle, 0, false, filePath);
      if (success) return;
    }
    await exportFile(content, fileName);
  };

  const handleSave = async () => {
    if (!content.trim()) return;

    if (liveHandle) {
      await saveFile(content, liveHandle, 0, false, filePath);
    } else {
      await handleExport();
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "editor": return <HiOutlineDocumentText size={14} />;
      case "preview": return <HiOutlineEye size={14} />;
      case "metrics": return <HiOutlineChartBar size={14} />;
      default: return <HiOutlineDocumentText size={14} />;
    }
  };

  const [draggedOverIndex, setDraggedOverIndex] = React.useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, path: string) => {
    const data = JSON.stringify({ 
      sourcePaneId: leaf.id, 
      filePath: path 
    });
    // Set custom type and fallback text/plain for better compatibility
    e.dataTransfer.setData("application/hermes-tab", data);
    e.dataTransfer.setData("text/plain", data);
    e.dataTransfer.effectAllowed = "move";
    
    // Explicitly set the drag image to the current tab element
    const target = e.currentTarget as HTMLElement;
    if (e.dataTransfer.setDragImage) {
      // Offset by roughly half the tab height and a small X offset
      e.dataTransfer.setDragImage(target, 20, 18);
    }
    
    // Set a class on the dragged element
    target.classList.add("opacity-20");
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.classList.remove("opacity-20");
    setDraggedOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index?: number) => {
    // Check for our custom type or check if it looks like our JSON in text/plain
    const types = e.dataTransfer.types;
    const isHermesTab = types.includes("application/hermes-tab") || types.includes("text/plain");
    
    if (isHermesTab) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (index !== undefined) {
        setDraggedOverIndex(index);
      }
    }
  };

  const handleDragLeave = () => {
    setDraggedOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOverIndex(null);

    let data = e.dataTransfer.getData("application/hermes-tab");
    if (!data) {
      data = e.dataTransfer.getData("text/plain");
    }
    
    if (!data) return;

    try {
      const parsed = JSON.parse(data);
      if (!parsed.sourcePaneId || !parsed.filePath) return;
      
      moveTab({ 
        sourcePaneId: parsed.sourcePaneId, 
        targetPaneId: leaf.id, 
        filePath: parsed.filePath, 
        targetIndex 
      });
    } catch {
      // Not our data
    }
  };

  return (
    <div 
      className={`h-full flex flex-col transition-all duration-300 overflow-hidden ${
        isActive && !isZenModeActive
          ? "bg-zinc-50 dark:bg-zinc-950 z-10" 
          : "bg-zinc-50 dark:bg-zinc-950"
      }`}
      onClick={() => setActivePaneId(leaf.id)}
    >
      {/* Pane Tabs Bar - Premium macOS Style */}
      {!isZenModeActive && (
        <div 
          className="flex items-center bg-zinc-50/50 dark:bg-zinc-950/50 backdrop-blur-3xl border-b border-zinc-200/50 dark:border-zinc-800/50 h-14 pt-2 shrink-0 overflow-x-auto overflow-y-hidden scrollbar-none px-2"
          onDragOver={(e) => handleDragOver(e)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, leaf.openFilePaths.length)}
        >
          {leaf.openFilePaths.map((path, index) => {
            const isTabActive = leaf.activeFilePath === path;
            const isDraggedOver = draggedOverIndex === index;
            const fileState = openFiles[path];
            const fileName = fileState?.fileName || path.split("/").pop() || "Untitled";
            const isDirty = fileState && fileState.content !== fileState.lastSavedContent;
            
            // Enhanced Save Status for this specific tab
            const isThisTabSaving = saveStatus.path === path && saveStatus.state === "saving";
            const isThisTabSaved = saveStatus.path === path && saveStatus.state === "saved";
            const isThisTabError = saveStatus.path === path && saveStatus.state === "error";

            return (
              <div
                key={path}
                draggable
                onDragStart={(e) => handleDragStart(e, path)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePaneId(leaf.id);
                  setActiveFilePath(path);
                }}
                className={`
                  group flex items-center gap-2 px-3 h-[32px] cursor-pointer min-w-[100px] md:min-w-[140px] max-w-[200px] transition-all shrink-0 relative rounded-xl mx-0.5
                  ${isTabActive 
                    ? "bg-white dark:bg-zinc-800 shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:shadow-none text-zinc-900 dark:text-zinc-100 ring-1 ring-zinc-200/50 dark:ring-zinc-700/50" 
                    : "text-zinc-500 hover:bg-zinc-200/40 dark:hover:bg-zinc-800/40"}
                  ${isDraggedOver ? "ring-2 ring-blue-500/50" : ""}
                `}
              >
                <span className={`${isTabActive ? "text-blue-500" : "text-zinc-400"} opacity-70 shrink-0`}>
                  {getIcon("editor")}
                </span>
                
                <span className={`text-[12px] truncate flex-1 tracking-tight font-medium ${isTabActive ? "opacity-100" : "opacity-80"}`}>
                  {fileName}
                </span>
                
                {(isDirty || isThisTabSaving || isThisTabSaved || isThisTabError) && (
                  <div 
                    className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-300 ${
                      isThisTabError 
                        ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" 
                        : isThisTabSaving
                        ? "bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                        : isThisTabSaved
                        ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                        : "bg-blue-500/80 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                    }`} 
                    title={
                      isThisTabError 
                        ? (saveStatus.message || "Save Error") 
                        : isThisTabSaving 
                        ? "Saving..." 
                        : isThisTabSaved 
                        ? "Saved" 
                        : "Unsaved changes"
                    } 
                  />
                )}

                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    
                    const autosaveMode = contentStore.get(atom_autosaveMode);
                    if (autosaveMode !== "manual") {
                      const fileState = openFiles[path];
                      const tabHandle = contentStore.get(atom_liveHandles(path));
                      if (fileState && fileState.content !== fileState.lastSavedContent && tabHandle) {
                        await saveFile(fileState.content, tabHandle, 0, true, path);
                      }
                    }

                    closeTab({ paneId: leaf.id, filePath: path });
                  }}
                  className={`p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all shrink-0 ${isTabActive ? "opacity-40 hover:opacity-100" : "opacity-0 group-hover:opacity-60"}`}
                >
                  <VscClose size={14} />
                </button>
              </div>
            );
          })}
          
          {/* Pane Actions - Minimalist */}
          <div className="flex items-center gap-0.5 ml-auto pl-4 pr-1 sticky right-0 bg-gradient-to-l from-zinc-50/90 via-zinc-50/80 to-transparent dark:from-zinc-950/90 dark:via-zinc-950/80 h-full shrink-0 z-20">
            {isActive && leaf.openFilePaths.length > 0 && (
              <>
                <button 
                  onClick={handleSave}
                  title="Save"
                  className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-blue-500 transition-all rounded-xl"
                >
                  <HiOutlineSave size={18} />
                </button>
                <div className="w-px h-3 bg-zinc-200 dark:bg-zinc-800 mx-1 opacity-50" />
              </>
            )}
            <button 
              onClick={() => splitPane({ id: leaf.id, direction: "horizontal" })}
              title="Split Right"
              className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all hidden sm:flex rounded-xl"
            >
              <VscSplitHorizontal size={16} />
            </button>
            <button 
              onClick={() => closePane(leaf.id)}
              title="Close Pane"
              className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-red-500 transition-all rounded-xl"
            >
              <HiOutlineX size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Pane Content */}
      <div className={`flex-1 overscroll-none ${isZenModeActive ? "overflow-hidden" : "overflow-auto"}`}>
        {leaf.openFilePaths.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-10 space-y-4">
             <HiOutlineDocumentText size={48} />
             <span className="text-xs font-medium tracking-tight">No file open</span>
          </div>
        ) : leaf.type === "editor" ? (
          <MarkdownEditor 
            key={leaf.activeFilePath || "draft"}
            value={content} 
            onChange={setContent}
            onWikiLinkClick={openFileByName}
            placeholder={`Editing ${leaf.activeFilePath || "Draft"}...`}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full opacity-20 space-y-2">
            {getIcon(leaf.type)}
            <span className="text-xs font-medium tracking-tight">{leaf.type} view</span>
          </div>
        )}
      </div>
    </div>
  );
}

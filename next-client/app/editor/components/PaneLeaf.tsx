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
import { HiOutlineDocumentText, HiOutlineEye, HiOutlineChartBar, HiOutlineX, HiOutlineCloudUpload, HiOutlineCheckCircle, HiOutlineExclamationCircle, HiOutlineSave } from "react-icons/hi";
import { VscSplitHorizontal, VscClose } from "react-icons/vsc";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useAtomValue } from "jotai";

interface PaneLeafProps {
  leaf: PanelLeaf;
}

function SaveStatusIndicator() {
  const saveStatus = useAtomValue(atom_saveStatus);

  switch (saveStatus.state) {
    case "saving":
      return (
        <div className="flex items-center gap-1 animate-pulse" title="Saving...">
          <HiOutlineCloudUpload size={14} className="text-blue-500" />
        </div>
      );
    case "saved":
      return (
        <div className="flex items-center gap-1 animate-in fade-in duration-300" title="Saved">
          <HiOutlineCheckCircle size={14} className="text-emerald-500" />
        </div>
      );
    case "error":
      return (
        <div className="flex items-center gap-1" title={saveStatus.message || "Save Error"}>
          <HiOutlineExclamationCircle size={14} className="text-red-500" />
        </div>
      );
    default:
      return null;
  }
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
      {/* Pane Tabs Bar - Flat & Seamless */}
      {!isZenModeActive && (
        <div 
          className="flex items-center bg-transparent border-b border-zinc-200 dark:border-zinc-800 h-10 sm:h-10 max-md:h-11 overflow-x-auto overflow-y-hidden scrollbar-none shrink-0"
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
                  group flex items-center gap-2 px-3 md:px-4 h-full cursor-pointer min-w-[100px] md:min-w-[140px] max-w-[200px] md:max-w-[320px] transition-all shrink-0 relative touch-pan-x
                  ${isTabActive ? "text-zinc-900 dark:text-zinc-100 font-semibold" : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}
                  ${isDraggedOver ? "bg-blue-500/5" : ""}
                `}
              >
                {/* Active Indicator Line */}
                {isTabActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 animate-in fade-in duration-300" />
                )}

                <span className={`${isTabActive ? "text-blue-500" : "text-zinc-400 dark:text-zinc-600"} opacity-70`}>{getIcon("editor")}</span>
                <span className="text-[12px] truncate flex-1 tracking-tight">
                  {fileName}
                </span>
                
                {isDirty && (
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" title="Unsaved changes" />
                )}

                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    
                    // Flush save before closing if autosave is enabled
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
                  className={`${isTabActive ? "opacity-60" : "opacity-0"} group-hover:opacity-100 p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all shrink-0`}
                >
                  <VscClose size={14} />
                </button>
              </div>
            );
          })}
          
          {/* Pane Actions - Minimalist */}
          <div className="flex items-center gap-0.5 ml-auto px-2 sticky right-0 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-sm h-full shrink-0 z-20">
            {isActive && leaf.openFilePaths.length > 0 && (
              <>
                <SaveStatusIndicator />
                <button 
                  onClick={handleSave}
                  title="Save"
                  className="p-1.5 text-zinc-400 hover:text-blue-500 transition-all"
                >
                  <HiOutlineSave size={16} />
                </button>
                <div className="w-px h-3 bg-zinc-200 dark:bg-zinc-800 mx-1" />
              </>
            )}
            <button 
              onClick={() => splitPane({ id: leaf.id, direction: "horizontal" })}
              title="Split Right"
              className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all hidden sm:block"
            >
              <VscSplitHorizontal size={14} />
            </button>
            <button 
              onClick={() => closePane(leaf.id)}
              title="Close Pane"
              className="p-1.5 text-zinc-400 hover:text-red-500 transition-all"
            >
              <HiOutlineX size={16} />
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

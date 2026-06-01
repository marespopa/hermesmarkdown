"use client";

import React from "react";
import { PanelLeaf } from "@/app/types/workspace";
import MarkdownEditor from "./MarkdownEditor";
import { useAtom } from "jotai";
import { atom_activePaneId, atom_fileContent, atom_openFiles, atom_splitPane, atom_closePane, atom_closeTab, atom_activeFilePath, atom_moveTab, atom_isZenModeActive, atom_saveStatus } from "@/app/atoms/atoms";
import { HiOutlineDocumentText, HiOutlineEye, HiOutlineChartBar, HiOutlineX, HiOutlineCloudUpload, HiOutlineCheckCircle, HiOutlineExclamationCircle, HiOutlineSaveAs, HiOutlineSave } from "react-icons/hi";
import { VscSplitHorizontal, VscSplitVertical, VscClose } from "react-icons/vsc";
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
  
  const isActive = activePaneId === leaf.id;

  const handleExport = async () => {
    if (!content.trim()) return;
    const fileState = openFiles[filePath];
    const fileName = fileState?.fileName || "Untitled";
    const handle = (fileState as any)?.handle;

    if (handle) {
      const success = await saveFile(content);
      if (success) return;
    }
    await exportFile(content, fileName);
  };

  const handleSave = async () => {
    if (!content.trim()) return;
    const fileState = openFiles[filePath];
    const handle = (fileState as any)?.handle;

    if (handle) {
      await saveFile(content);
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
          ? "ring-1 ring-blue-500/50 bg-white dark:bg-neutral-900 shadow-lg z-10" 
          : "bg-white dark:bg-neutral-900"
      }`}
      onClick={() => setActivePaneId(leaf.id)}
    >
      {/* Pane Tabs Bar */}
      {!isZenModeActive && (
        <div 
          className="flex items-center bg-neutral-100/50 dark:bg-neutral-950/50 border-b border-neutral-200 dark:border-neutral-800 h-9 overflow-x-auto overflow-y-hidden scrollbar-none shrink-0"
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
                  group flex items-center gap-2 px-3 h-full border-r border-neutral-200 dark:border-neutral-800 cursor-pointer min-w-[100px] max-w-[200px] transition-all shrink-0
                  ${isTabActive ? "bg-white dark:bg-neutral-900 opacity-100" : "opacity-40 hover:opacity-100 hover:bg-white/50 dark:hover:bg-neutral-900/50"}
                  ${isDraggedOver ? "border-l-2 border-l-blue-500 bg-blue-500/5" : ""}
                `}
              >
                <span className="text-blue-500">{getIcon("editor")}</span>
                <span className="text-[11px] font-medium truncate flex-1 tracking-tight">
                  {fileName}
                </span>
                
                {isDirty && (
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" title="Unsaved changes" />
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab({ paneId: leaf.id, filePath: path });
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all shrink-0"
                >
                  <VscClose size={12} />
                </button>
              </div>
            );
          })}
          
          {/* Pane Actions */}
          <div className="flex items-center gap-1 ml-auto px-2 sticky right-0 bg-neutral-100/80 dark:bg-neutral-950/80 backdrop-blur-sm h-full border-l border-neutral-200/50 dark:border-neutral-800/50 shrink-0 z-20">
            {isActive && leaf.openFilePaths.length > 0 && (
              <>
                <SaveStatusIndicator />
                <button 
                  onClick={handleSave}
                  title="Save"
                  className="p-1.5 opacity-20 hover:opacity-100 hover:text-blue-500 transition-all"
                >
                  <HiOutlineSave size={14} />
                </button>
                <button 
                  onClick={handleExport}
                  title="Export / Save As"
                  className="p-1.5 opacity-20 hover:opacity-100 hover:text-blue-500 transition-all"
                >
                  <HiOutlineSaveAs size={14} />
                </button>
                <div className="w-px h-3 bg-neutral-300 dark:bg-neutral-700 mx-1" />
              </>
            )}
            <button 
              onClick={() => splitPane({ id: leaf.id, direction: "horizontal" })}
              title="Split Right"
              className="p-1.5 opacity-20 hover:opacity-100 hover:text-blue-500 transition-all"
            >
              <VscSplitHorizontal size={14} />
            </button>
            <button 
              onClick={() => splitPane({ id: leaf.id, direction: "vertical" })}
              title="Split Down"
              className="p-1.5 opacity-20 hover:opacity-100 hover:text-blue-500 transition-all"
            >
              <VscSplitVertical size={14} />
            </button>
            <button 
              onClick={() => closePane(leaf.id)}
              title="Close Pane"
              className="p-1.5 opacity-20 hover:opacity-100 hover:text-red-500 transition-all"
            >
              <HiOutlineX size={14} />
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

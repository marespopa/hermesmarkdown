"use client";

import React from "react";
import { PanelLeaf } from "@/app/types/workspace";
import MarkdownEditor from "./MarkdownEditor";
import { useAtom } from "jotai";
import { atom_activePaneId, atom_fileContent, atom_openFiles, atom_splitPane, atom_closePane, atom_closeTab, atom_activeFilePath } from "@/app/atoms/atoms";
import { HiOutlineDocumentText, HiOutlineEye, HiOutlineChartBar, HiOutlineX } from "react-icons/hi";
import { VscSplitHorizontal, VscSplitVertical, VscClose } from "react-icons/vsc";
import { useFileSystem } from "@/app/hooks/use-file-system";

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

  const { openFileByName } = useFileSystem();
  const filePath = leaf.activeFilePath || "draft";
  const [content, setContent] = useAtom(atom_fileContent(filePath));
  
  const isActive = activePaneId === leaf.id;

  const getIcon = (type: string) => {
    switch (type) {
      case "editor": return <HiOutlineDocumentText size={14} />;
      case "preview": return <HiOutlineEye size={14} />;
      case "metrics": return <HiOutlineChartBar size={14} />;
      default: return <HiOutlineDocumentText size={14} />;
    }
  };

  return (
    <div 
      className={`h-full flex flex-col transition-all duration-300 overflow-hidden ${
        isActive 
          ? "ring-1 ring-blue-500/50 bg-white dark:bg-neutral-900 shadow-lg z-10" 
          : "bg-neutral-50/50 dark:bg-neutral-900/50 hover:bg-white dark:hover:bg-neutral-900"
      }`}
      onClick={() => setActivePaneId(leaf.id)}
    >
      {/* Pane Tabs Bar */}
      <div className="flex items-center bg-neutral-100/50 dark:bg-neutral-950/50 border-b border-neutral-200 dark:border-neutral-800 h-9 overflow-x-auto overflow-y-hidden scrollbar-none">
        {leaf.openFilePaths.map((path) => {
          const isTabActive = leaf.activeFilePath === path;
          const fileName = openFiles[path]?.fileName || path.split("/").pop() || "Untitled";
          
          return (
            <div
              key={path}
              onClick={(e) => {
                e.stopPropagation();
                setActivePaneId(leaf.id);
                setActiveFilePath(path);
              }}
              className={`
                group flex items-center gap-2 px-3 h-full border-r border-neutral-200 dark:border-neutral-800 cursor-pointer min-w-[100px] max-w-[200px] transition-colors shrink-0
                ${isTabActive ? "bg-white dark:bg-neutral-900 opacity-100" : "opacity-40 hover:opacity-100 hover:bg-white/50 dark:hover:bg-neutral-900/50"}
              `}
            >
              <span className="text-blue-500">{getIcon("editor")}</span>
              <span className="text-[11px] font-medium truncate flex-1 tracking-tight">
                {fileName}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab({ paneId: leaf.id, filePath: path });
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all"
              >
                <VscClose size={12} />
              </button>
            </div>
          );
        })}
        
        {/* Pane Actions */}
        <div className="flex items-center gap-1 ml-auto px-2 sticky right-0 bg-neutral-100/80 dark:bg-neutral-950/80 backdrop-blur-sm h-full border-l border-neutral-200/50 dark:border-neutral-800/50">
          <button 
            onClick={() => splitPane({ id: leaf.id, direction: "horizontal" })}
            title="Split Right"
            className="p-1.5 opacity-20 hover:opacity-100 hover:text-blue-500 transition-all"
          >
            <VscSplitVertical size={14} />
          </button>
          <button 
            onClick={() => splitPane({ id: leaf.id, direction: "vertical" })}
            title="Split Down"
            className="p-1.5 opacity-20 hover:opacity-100 hover:text-blue-500 transition-all"
          >
            <VscSplitHorizontal size={14} />
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

      {/* Pane Content */}
      <div className="flex-1 overflow-auto overscroll-none">
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

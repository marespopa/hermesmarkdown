"use client";

import React from "react";
import { useAtom } from "jotai";
import { atom_files, atom_selectedFileId } from "@/app/atoms/atoms";
import { FaTimes } from "react-icons/fa";

export const FileTabs: React.FC = () => {
  const [files, setFiles] = useAtom(atom_files);
  const [selectedId, setSelectedId] = useAtom(atom_selectedFileId);

  const handleSelectTab = (fileId: string) => {
    setSelectedId(fileId);
  };

  const handleCloseTab = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFiles = files.filter((f) => f.id !== fileId);
    setFiles(newFiles);

    // If the closed file was selected, select another one
    if (selectedId === fileId) {
      const nextFile = newFiles[newFiles.length - 1];
      setSelectedId(nextFile ? nextFile.id : null);
    }
  };

  // Don't show tabs if no files are open
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="flex border-b border-gray-300 dark:border-gray-700 bg-gray-200 dark:bg-gray-900 overflow-hidden">
      <div className="flex gap-0 overflow-x-auto overflow-y-hidden flex-1 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent dark:scrollbar-thumb-gray-600">
        {files.map((file) => {
          const isSelected = file.id === selectedId;
          const hasUnsavedChanges = !file.isSaved;

          return (
            <div
              key={file.id}
              className={`flex items-center gap-2 px-3.5 py-2.5 border-r border-gray-300 dark:border-gray-700 cursor-pointer user-select-none text-xs whitespace-nowrap min-w-[120px] max-w-[200px] transition-all duration-200 relative ${
                isSelected
                  ? "bg-amber-50 dark:bg-slate-700 text-amber-900 dark:text-amber-100 border-b-2 border-amber-400 dark:border-amber-500 font-semibold shadow-sm"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700"
              }`}
              onClick={() => handleSelectTab(file.id)}
            >
              <div className="flex items-center gap-1.5 flex-1 overflow-hidden">
                <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                  {file.frontMatter.fileName}
                </span>
                {hasUnsavedChanges && (
                  <span className={`text-xs flex-shrink-0 animate-pulse ${isSelected ? "text-amber-500" : "text-gray-400"}`}>
                    ●
                  </span>
                )}
              </div>
              <button
                className={`flex items-center justify-center border-none rounded transition-all duration-200 flex-shrink-0 p-0.5 ${
                  isSelected
                    ? "hover:bg-amber-200 dark:hover:bg-slate-600 text-amber-700 dark:text-amber-300"
                    : "hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-500 active:bg-gray-400 dark:active:bg-slate-600"
                }`}
                onClick={(e) => handleCloseTab(file.id, e)}
                title="Close file"
              >
                <FaTimes size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

"use client";

import React from "react";
import { useAtom } from "jotai";
import { atom_files, atom_selectedFileId } from "@/app/atoms/atoms";
import { FaTimes } from "react-icons/fa";

const FileTabs: React.FC = () => {
  const [files, setFiles] = useAtom(atom_files);
  const [selectedId, setSelectedId] = useAtom(atom_selectedFileId);

  if (!files || files.length === 0) return null;

  const handleCloseTab = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFiles = files.filter((f) => f.id !== fileId);
    setFiles(newFiles);
    if (selectedId === fileId) {
      const nextFile = newFiles[newFiles.length - 1];
      setSelectedId(nextFile ? (nextFile.id as any) : null);
    }
  };

  return (
    <nav className="flex items-center h-10 px-4 gap-1 bg-amber-50/50 dark:bg-black/20 border-b border-neutral-200/50 dark:border-neutral-800/50 overflow-x-auto no-scrollbar select-none">
      {files.map((file) => {
        const isSelected = file.id === selectedId;
        return (
          <div
            key={file.id}
            onClick={() => setSelectedId(file.id)}
            className={`
              group flex items-center gap-2 px-3 py-1 cursor-pointer rounded-md transition-all text-[12px]
              ${isSelected 
                ? "bg-white dark:bg-neutral-900 text-sky-600 dark:text-sky-400 font-bold shadow-sm" 
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }
            `}
          >
            <span className="truncate max-w-[150px]">{file.frontMatter?.fileName || file.name || "Untitled"}</span>
            <button
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
              onClick={(e) => handleCloseTab(file.id, e)}
            >
              <FaTimes size={8} />
            </button>
          </div>
        );
      })}
    </nav>
  );
};

export default FileTabs;

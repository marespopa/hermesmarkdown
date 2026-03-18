"use client";

import React from "react";
import { useAtom } from "jotai";
import { atom_files, atom_selectedFileId } from "@/app/atoms/atoms";
import { FaTimes } from "react-icons/fa";
import Button from "@/app/components/Button";

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
    <nav className="flex items-center h-11 px-4 gap-1 overflow-x-auto no-scrollbar select-none font-mono">
      {files.map((file) => {
        const isSelected = file.id === selectedId;
        return (
          <div
            key={file.id}
            onClick={() => setSelectedId(file.id)}
            className={`
                  group relative flex items-center gap-2 px-4 h-8 cursor-pointer transition-all text-[12px] whitespace-nowrap
                  ${isSelected
                    ? "text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              }
            `}
          >
            <span className="truncate max-w-[140px] tracking-tight">
              {file.frontMatter?.fileName || "untitled.md"}
            </span>

            <Button
              variant="bare"
              styles={`p-1 rounded-sm transition-all ${isSelected ? "opacity-40 hover:opacity-80" : "opacity-0 group-hover:opacity-40 hover:opacity-100"}`}
              onClick={(e) => handleCloseTab(file.id, e)}
            >
              <FaTimes size={10} />
            </Button>
    
                {isSelected && (
                  <div className="absolute left-2 right-2 bottom-[-1.5px] h-[3px] rounded-full bg-gradient-to-r from-zinc-600 to-zinc-400 dark:from-zinc-200 dark:to-zinc-500 shadow-md" />
                )}
          </div>
        );
      })}
    </nav>
  );
};

export default FileTabs;

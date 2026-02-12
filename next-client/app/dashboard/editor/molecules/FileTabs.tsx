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
    if (selectedId === fileId) {
      const nextFile = newFiles[newFiles.length - 1];
      setSelectedId(nextFile ? nextFile.id : null);
    }
  };

  if (files.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 flex overflow-y-auto overflow-x-auto">
      {files.map((file, idx) => {
        const isSelected = file.id === selectedId;
        let borderClass = getBorderClass();

        return (
          <div
            key={file.id}
            className={`relative flex items-center px-4 pt-2 pb-1 cursor-pointer select-none transition-colors duration-150
              ${
                isSelected
                  ? "bg-gray-50 dark:bg-gray-800 border-t border-t-gray-200 dark:border-t-gray-700 text-gray-900 dark:text-gray-100 shadow-sm z-10"
                  : "bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 z-0 border-t border-t-gray-200 dark:border-t-gray-700"
              }
              ${borderClass}
            `}
            style={{ minWidth: 0 }}
            onClick={() => handleSelectTab(file.id)}
          >
            <span className="mr-2 truncate max-w-[120px] font-medium text-sm">
              {file.frontMatter.fileName}
            </span>
            <button
              className="ml-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 focus:outline-none text-lg leading-none"
              onClick={(e) => handleCloseTab(file.id, e)}
              aria-label="Close tab"
            >
              <FaTimes size={14} />
            </button>
            {isSelected && (
              <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-amber-500 dark:bg-amber-400 rounded-t" />
            )}
          </div>
        );

        function getBorderClass() {
          const isFirst = idx === 0;
          const isLast = idx === files.length - 1;
          let borderClass = "border border-gray-200 dark:border-gray-700";
          let radiusClass = "";
          if (isFirst) {
            radiusClass = "rounded-tl-md";
          }
          if (isLast) {
            radiusClass += " rounded-tr-md";
          }
          return borderClass;
        }
      })}
    </div>
  );
};

export default FileTabs;

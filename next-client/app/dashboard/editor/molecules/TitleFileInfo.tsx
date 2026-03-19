"use client";

import React from "react";
import { HiPencil } from "react-icons/hi2";
import Button from "@/app/components/Button";

interface TitleFileInfoProps {
  fileTitle: string;
  fileName: string;
  hasTitle: boolean;
  showFileDialog: () => void;
}

const TitleFileInfo: React.FC<TitleFileInfoProps> = ({
  fileTitle,
  fileName,
  hasTitle,
  showFileDialog
}) => {
  const formattedFileName = fileName?.endsWith(".md") ? fileName : `${fileName}.md`;

  return (
    <div 
      onClick={showFileDialog}
      className="group flex items-center justify-between gap-4 w-fit min-w-[320px] px-4 py-2.5 
                 cursor-pointer select-none rounded-xl border transition-all duration-200
                 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md
                 border-zinc-200 dark:border-zinc-800
                 hover:border-zinc-300 dark:hover:border-zinc-700
                 hover:shadow-sm active:scale-[0.98]"
    >
      <div className="flex flex-col truncate">
        {/* Title: Using a tighter tracking and semi-bold weight for Apple feel */}
        <h1 className={`
          text-[14px] font-semibold tracking-tight truncate
          ${hasTitle ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500"}
        `}>
          {hasTitle ? fileTitle : "Untitled Document"}
        </h1>
        
        {/* Filename: Secondary metadata style */}
        <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 opacity-80">
          {formattedFileName}
        </span>
      </div>

      {/* Action Area: Only shows prominence on hover */}
      <div className="flex items-center gap-2 pl-4 border-l border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md 
                        bg-zinc-100/50 dark:bg-zinc-800/50 
                        text-zinc-500 dark:text-zinc-400
                        group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          <HiPencil size={14} />
          <span className="text-[11px] font-medium tracking-wide uppercase">Edit</span>
        </div>
      </div>
    </div>
  );
};

export default TitleFileInfo;

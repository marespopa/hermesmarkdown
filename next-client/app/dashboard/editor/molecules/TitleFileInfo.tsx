"use client";

import React from "react";
import { HiPencil } from "react-icons/hi2";

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
      // Reduced mobile gap to 2vw (~8px) and tighter mobile padding
      className="group flex items-center justify-between
                 w-fit max-w-[95vw] sm:max-w-[450px]
                 px-[3vw] py-[2vw] sm:px-4 sm:py-2.5 
                 cursor-pointer select-none rounded-2xl border 
                 transition-all duration-200 ease-out
                 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl
                 border-zinc-200 dark:border-zinc-800
                 hover:border-zinc-400 dark:hover:border-zinc-600
                 hover:shadow-md active:scale-[0.97] active:bg-zinc-50 dark:active:bg-zinc-800"
      style={{ gap: "2vw" }} 
    >
      {/* Text Stack */}
      <div className="flex flex-col min-w-0">
        <h1 className={`
          text-[3.8vw] sm:text-[14px] font-semibold tracking-tight truncate
          ${hasTitle ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500"}
        `}>
          {hasTitle ? fileTitle : "Untitled Document"}
        </h1>
        
        <span className="text-[2.8vw] sm:text-[11px] font-mono text-zinc-500 dark:text-zinc-400 opacity-70 truncate">
          {formattedFileName}
        </span>
      </div>

      {/* Edit Button - Compact scaling */}
      <div className="flex-shrink-0 flex items-center gap-[1vw] sm:gap-1.5 
                      px-[2vw] py-[1.2vw] sm:px-2.5 sm:py-1.5 rounded-full 
                      bg-zinc-100 dark:bg-zinc-800 
                      text-zinc-600 dark:text-zinc-300
                      group-hover:bg-blue-50 group-hover:text-blue-600 
                      dark:group-hover:bg-blue-900/30 dark:group-hover:text-blue-400 
                      transition-all">
        <HiPencil className="w-[3.2vw] h-[3.2vw] sm:w-[14px] sm:h-[14px]" />
        <span className="text-[2.6vw] sm:text-[10px] font-bold tracking-wider uppercase">
          Edit
        </span>
      </div>
    </div>
  );
};

export default TitleFileInfo;

"use client";

import React from "react";

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
}) => (
  <div className="group flex flex-col gap-0.5 select-none py-2 pl-4">
    {/* The Interactive Title Area */}
    <div 
      className="flex items-baseline gap-3 cursor-pointer"
      onClick={showFileDialog}
    >
      <h1 className="text-lg font-normal tracking-tight text-neutral-800 dark:text-neutral-200 font-serif italic">
        {hasTitle ? fileTitle : "Untitled"}
      </h1>
      
      {/* Ghost Metadata: Only visible on hover, like iA Writer's focus mode */}
      <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-[10px] uppercase tracking-[0.2em] text-sky-600 font-bold">
        Edit
      </span>
    </div>

    {/* The Path/Filename: Monospaced and subtle */}
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500 tracking-wide">
        {fileName?.endsWith(".md") ? fileName : `${fileName}.md`}
      </span>
    </div>
  </div>
);

export default TitleFileInfo;

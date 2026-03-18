"use client";

import React from "react";
import { FaPencilAlt } from "react-icons/fa";
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
}) => (
  <div className="flex flex-col gap-1 select-none py-4 pl-6">
    {/* The Interactive Title Area */}
    <div className="flex items-center gap-3">
      <h1 className={`
        text-2xl font-normal tracking-tight font-serif italic
        ${hasTitle ? "text-zinc-800 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-600"}
      `}>
        {hasTitle ? fileTitle : "Untitled"}
      </h1>
      
      {/* Permanent Edit Trigger */}
      <Button
        variant="bare"
        onClick={showFileDialog}
        styles="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-all group"
      >
        <FaPencilAlt size={10} className="opacity-50 group-hover:opacity-100" />
        <span className="text-[12px] font-mono lowercase tracking-tight">edit</span>
      </Button>
    </div>

    {/* File naming: Simple, monospaced label */}
    <div className="flex items-center gap-2">
      <span className="text-[12px] font-mono text-zinc-400 dark:text-zinc-500 tracking-tight">
        {fileName?.endsWith(".md") ? fileName : `${fileName}.md`}
      </span>
    </div>
  </div>
);

export default TitleFileInfo;

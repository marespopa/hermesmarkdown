import React from "react";
import MarkdownEditor from "./MarkdownEditor";

interface Props { 
  contentEdited: string;
  setContentEdited: (content: string) => void;
  setHasChanges: (hasChanges: boolean) => void;
  fontFamily: string;
  fontSize: string;
}

export default function EditorContent({
  contentEdited,
  setContentEdited,
  setHasChanges,
  fontFamily,
  fontSize,
}: Props) {
  return (
    <div className="flex-1 flex flex-col min-h-0 w-full mb-4">
      <div className="flex-1 min-h-0 w-full border border-strongblack dark:border-white/20 bg-white dark:bg-neutral-800 rounded-2xl shadow-lg px-2 py-2 flex flex-col">
        <MarkdownEditor
          value={contentEdited}
          onChange={val => {
            setContentEdited(val);
            setHasChanges(true);
          }}
          fontFamily={fontFamily}
          fontSize={fontSize}
        />
      </div>
    </div>
  );
}

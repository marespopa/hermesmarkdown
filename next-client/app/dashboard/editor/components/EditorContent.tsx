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
    <div className="my-2 w-full flex justify-center">
      <div className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg shadow-sm px-2 py-2">
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

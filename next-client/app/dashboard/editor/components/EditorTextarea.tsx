import TextareaResizable from "@/app/components/TextareaResizable";
import React from "react";

type Props = {
  contentEdited: string;
  setContentEdited: (e: string) => void;
  onCursorChange?: (lineText: string) => void;
};
export default function EditorTextarea({
  contentEdited,
  setContentEdited,
  onCursorChange,
}: Props) {
  return (
    <TextareaResizable
      name="content"
      value={contentEdited}
      handleChange={(e) => setContentEdited(e.currentTarget.value)}
      onCursorChange={onCursorChange}
      noBorder={true}
    />
  );
}

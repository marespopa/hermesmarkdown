import { atom_searchTerm } from "@/app/atoms/atoms";
import useAutoResizeTextArea from "@/app/hooks/use-autoresize";
import { useAtom } from "jotai";
import { useEffect, useRef } from "react";

interface Props {
  name: string;
  value: string | undefined;
  placeholder?: string;
  handleChange: (e: React.FormEvent<HTMLTextAreaElement>) => void;
  onCursorChange?: (lineText: string) => void;
  noBorder?: boolean;
}

const TextareaResizable = ({
  name,
  value = " ",
  placeholder,
  handleChange,
  onCursorChange,
  noBorder,
}: Props) => {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  useAutoResizeTextArea(textAreaRef, value);

  function handleCursorChange() {
    if (!onCursorChange || !textAreaRef.current) return;
    const textarea = textAreaRef.current;
    const cursorPos = textarea.selectionStart;
    const textUptoCursor = textarea.value.slice(0, cursorPos);
    const lines = textUptoCursor.split("\n");
    const currentLine = lines[lines.length - 1];
    onCursorChange(currentLine);
  }

  return (
    <div>
      <textarea
        className={
          `bg-white dark:bg-gray-900 text-black dark:text-white rounded-none font-mono font-bold px-4 py-4 outline-none w-full` +
          (noBorder ? "" : " border border-black")
        }
        ref={textAreaRef}
        rows={4}
        id={name}
        name={name}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        spellCheck={true}
        data-testid="editor-textarea"
        onSelect={handleCursorChange}
        onKeyUp={handleCursorChange}
      />
    </div>
  );
};

export default TextareaResizable;

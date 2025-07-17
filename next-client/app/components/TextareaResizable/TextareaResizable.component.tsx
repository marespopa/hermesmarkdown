import React, { useRef } from "react";

interface Props {
  name: string;
  value: string | undefined;
  placeholder?: string;
  handleChange: (e: React.FormEvent<HTMLTextAreaElement>) => void;
  onCursorChange?: (lineText: string) => void;
  noBorder?: boolean;
  style?: React.CSSProperties;
}

const FONT_SIZE = "1rem"; // 16px
const LINE_HEIGHT = "1.5em";

const TextareaResizable = ({
  name,
  value = "",
  placeholder,
  handleChange,
  onCursorChange,
  noBorder,
  style,
}: Props) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLPreElement>(null);

  // Handle cursor change (optional)
  function handleCursorChange() {
    if (!onCursorChange || !textareaRef.current) return;
    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const textUptoCursor = textarea.value.slice(0, cursorPos);
    const lines = textUptoCursor.split("\n");
    const currentLine = lines[lines.length - 1];
    onCursorChange(currentLine);
  }

  // Generate line numbers (always show one extra for the next empty row)
  const lines = (value || "").split("\n");
  const lineCount = Math.max(1, lines.length) + 1;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1).join("\n");

  return (
    <div className="w-full border border-neutral-200 dark:border-neutral-700 rounded" style={{ minHeight: "6em", maxHeight: "60vh", ...style }}>
      <div
        className="flex w-full h-full"
        style={{ width: "100%", height: "100%", overflowY: "auto", overflowX: "hidden" }}
      >
        <pre
          ref={lineNumbersRef}
          aria-hidden="true"
          className="select-none text-right pr-3 pl-2 bg-neutral-50 dark:bg-neutral-900/60 text-neutral-400 dark:text-neutral-600 border-r border-neutral-200 dark:border-neutral-700 rounded-l"
          style={{ minWidth: 32, margin: 0, paddingTop: 16, paddingBottom: 0, userSelect: "none", fontSize: FONT_SIZE, lineHeight: LINE_HEIGHT, height: "100%" }}
        >
          {lineNumbers}
        </pre>
        <textarea
          ref={textareaRef}
          className={
            `bg-white dark:bg-gray-900 text-black dark:text-white font-mono px-4 outline-none w-full resize-none` +
            (noBorder ? "" : " border-none")
          }
          id={name}
          name={name}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          spellCheck={true}
          data-testid="editor-textarea"
          onSelect={handleCursorChange}
          onKeyUp={handleCursorChange}
          style={{ fontFamily: "monospace", fontSize: FONT_SIZE, lineHeight: LINE_HEIGHT, whiteSpace: "pre", height: "100%", minHeight: "6em", maxHeight: "60vh", paddingTop: 16, paddingBottom: 0, borderRadius: 0, overflow: "auto" }}
          wrap="off"
          rows={Math.max(1, lines.length)}
        />
      </div>
    </div>
  );
};

export default TextareaResizable;

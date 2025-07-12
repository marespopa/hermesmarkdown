import { atom_searchTerm } from "@/app/atoms/atoms";
import useAutoResizeTextArea from "@/app/hooks/use-autoresize";
import { useAtom } from "jotai";
import { useEffect, useRef } from "react";

interface Props {
  name: string;
  value: string | undefined;
  placeholder?: string;
  handleChange: (e: React.FormEvent<HTMLTextAreaElement>) => void;
}

const TextareaResizable = ({
  name,
  value = " ",
  placeholder,
  handleChange,
}: Props) => {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  useAutoResizeTextArea(textAreaRef, value);

  return (
    <div className="my-4">
      <textarea
        className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 border-2 prose prose-sm dark:prose-invert !max-w-none border-slate-100 dark:border-slate-700 px-4 py-4 rounded-sm outline-none w-full text-gray-900 dark:text-gray-100"
        ref={textAreaRef}
        rows={4}
        id={name}
        name={name}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        spellCheck={true}
        data-testid="editor-textarea"
      />
    </div>
  );
};

export default TextareaResizable;

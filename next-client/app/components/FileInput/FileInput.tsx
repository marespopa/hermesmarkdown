import React, { useRef, useState } from "react";

interface Props {
  name: string;
  label: string;
  helperText?: string;
  handleChange: (files: FileList | null) => void;
  accept?: string;
}

const FileInput = ({ name, label, helperText, handleChange, accept }: Props) => {
  const [fileName, setFileName] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileName(e.target.files[0].name);
    } else {
      setFileName("");
    }
    handleChange(e.target.files);
  };

  return (
    <div className="my-4">
      <label className="flex flex-col">
        <span className="text-black dark:text-white font-mono font-bold text-sm mb-1">{label}</span>
        <div className="flex items-center gap-3">
          <label
            htmlFor={name}
            className="bg-white dark:bg-neutral-900 text-black dark:text-white border border-neutral-400 dark:border-neutral-600 rounded-none font-mono px-4 py-2 cursor-pointer font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            Choose file

            <input
              ref={inputRef}
              id={name}
              name={name}
              type="file"
              accept={accept}
              className="hidden"
              onChange={onFileChange}
            />
          </label>
          <span className="text-black dark:text-white font-mono text-sm truncate max-w-xs">{fileName || "No file chosen"}</span>
        </div>
      </label>
      {helperText && <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-1">{helperText}</p>}
    </div>
  );
};

export default FileInput;

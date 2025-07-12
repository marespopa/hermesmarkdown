import { InputHTMLAttributes, useEffect, useRef } from "react";
import * as React from "react";

interface Props {
  name: string;
  label: string;
  fileList: File[];
  accept: string;
  handleChange(fileList: FileList): void;
  placeholder?: string;
  helperText?: string;
}

const FileInput = ({
  name,
  label,
  fileList = [],
  handleChange,
  placeholder,
  helperText,
  accept,
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      const dataTransfer = new DataTransfer();
      Array.from(fileList).forEach((file) => dataTransfer.items.add(file));
      inputRef.current.files = dataTransfer.files;
    }
  }, [fileList]);

  return (
    <div className="my-4">
      <label className="flex flex-col">
        <span className="text-black font-mono font-bold text-sm">{label}</span>
        <input
          name={name}
          className="bg-white dark:bg-gray-900 text-black dark:text-white border-4 border-black rounded-none font-mono font-bold px-2 py-2 focus:outline-none"
          type="file"
          ref={inputRef}
          data-testid="uploader"
          placeholder={placeholder}
          accept={accept}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            if (!e.target.files) {
              return;
            }

            handleChange(e.target.files);
          }}
        />
      </label>
      {helperText && <p className="text-gray-500  text-xs">{helperText}</p>}
    </div>
  );
};

export default FileInput;

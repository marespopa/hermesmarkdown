import React from "react";
import { FaPen } from "react-icons/fa";

interface TitleFileInfoProps {
  fileTitle: string;
  fileName: string;
  hasTitle: boolean;
  showFileDialog: () => void;
  renderFontMenu: () => React.ReactNode;
  renderFontSizeMenu: () => React.ReactNode;
}

const TitleFileInfo: React.FC<TitleFileInfoProps> = ({
  fileTitle,
  fileName,
  hasTitle,
  showFileDialog,
  renderFontMenu,
  renderFontSizeMenu,
}) => (
  <div className="flex flex-col gap-1 min-w-0 w-full sm:w-auto">
    <div className="flex flex-row items-center gap-2 min-w-0 justify-center sm:justify-start sm:mt-2">
      <h1 className="truncate text-xl font-semibold text-black dark:text-white leading-tight text-center sm:text-left">
        {hasTitle && `${fileTitle}`}
      </h1>
      <span
        className="cursor-pointer"
        onClick={showFileDialog}
        title="Edit Title"
        aria-label="Edit Title"
      >
        <FaPen />
      </span>
    </div>
    <span className="text-xs text-gray-500 dark:text-gray-100 font-mono truncate text-center sm:text-left">{`${fileName?.endsWith(".md") ? fileName : fileName + ".md"}`}</span>
    {/* Remove the badge for unsaved changes */}
    <div className="mt-1 flex flex-col gap-1 items-center sm:items-start">
      <div className="flex flex-row gap-2 items-center justify-center">
        {renderFontMenu()}
        {renderFontSizeMenu()}
      </div>
    </div>
  </div>
);

export default TitleFileInfo;

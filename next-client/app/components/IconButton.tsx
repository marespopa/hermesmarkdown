import React from "react";
import { FaChevronDown } from "react-icons/fa";

interface IconButtonProps {
  icon: React.ReactNode;
  title: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  isActive?: boolean;
  "aria-label"?: string;
  className?: string;
  dataTestId?: string;
  showDropdownIndicator?: boolean;
}

const IconButton: React.FC<IconButtonProps> = ({
  icon,
  title,
  onClick,
  isActive = false,
  "aria-label": ariaLabel,
  className = "",
  dataTestId,
  showDropdownIndicator = false,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-2 py-2 min-w-[44px] h-10 border border-black rounded-none bg-white text-black font-mono font-bold flex items-center justify-center relative hover:bg-black hover:text-white ${className}`}
    aria-label={ariaLabel || title}
    title={title}
    data-testid={dataTestId}
  >
    <span className="flex items-center justify-center h-5">
      <span className="w-5 h-5 flex items-center justify-center">{icon}</span>
      {showDropdownIndicator && (
        <FaChevronDown className="w-3 h-3 ml-1 self-center text-gray-400 dark:text-gray-500" />
      )}
    </span>
  </button>
);

export default IconButton; 
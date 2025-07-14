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
    className={`border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium flex items-center justify-center transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-500 min-w-[44px] h-10 px-2 py-2 ${className}`}
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
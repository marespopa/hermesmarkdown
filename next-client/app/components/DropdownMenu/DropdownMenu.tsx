"use client";

import React, { useEffect, useRef, useState } from "react";
import Button from "../Button";
import { FaCaretDown } from "react-icons/fa";

type DropdownOption = {
  label: string;
  action: () => void;
};

type Props = {
  label: string;
  options: DropdownOption[];
};

const DropdownMenu = ({ label, options }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null); // Ref to track the dropdown element
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleOptionClick = (option: DropdownOption) => {
    setIsOpen(false); // Close the dropdown after selecting an option
    option.action();
    // Add specific functionality based on the option here if needed
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <Button variant="secondary" handler={toggleDropdown}>
        {label === "File" ? (
          <span className="flex items-center gap-2">{label} <FaCaretDown /></span>
        ) : (
          label
        )}
      </Button>
      {isOpen && (
        <div className="absolute -left-1 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-sm z-10">
          {options.map((option) => (
            <button
              key={option.label}
              onClick={() => handleOptionClick(option)}
              className="w-full inline px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm whitespace-nowrap"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DropdownMenu;

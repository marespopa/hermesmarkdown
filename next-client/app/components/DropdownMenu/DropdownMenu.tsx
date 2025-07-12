"use client";

import React, { useEffect, useRef, useState } from "react";
import Button from "../Button";
import { FaCaretDown } from "react-icons/fa";

type DropdownOption = {
  label: string;
  action: () => void;
};

type Props = {
  label?: string;
  options: DropdownOption[];
  trigger?: React.ReactElement<any>;
};

const DropdownMenu = ({ label, options, trigger }: Props) => {
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
      {trigger ? (
        React.cloneElement(trigger, {
          onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            toggleDropdown();
            if (typeof (trigger.props as any).onClick === 'function') (trigger.props as any).onClick(e);
          },
          'aria-expanded': isOpen,
        })
      ) : (
        <Button variant="secondary" handler={toggleDropdown} styles="border-2 border-black rounded-none bg-white text-black font-mono font-bold hover:bg-black hover:text-white">
          {label === "File" ? (
            <span className="flex items-center gap-2">{label} <FaCaretDown /></span>
          ) : (
            label
          )}
        </Button>
      )}
      {isOpen && (
        <div className="absolute right-0 mt-1 w-fit bg-white dark:bg-gray-900/95 text-black dark:text-white border-t-0 border-l border-r border-b border-black dark:border-white/20 rounded-none shadow-lg font-mono font-bold z-10" style={{ borderRadius: '0 !important' }}>
          {options.map((option) => (
            <button
              key={option.label}
              onClick={() => handleOptionClick(option)}
              className="w-full px-3 py-1 text-left text-black dark:text-white bg-white dark:bg-gray-900 border-t border-black font-mono font-bold rounded-none"
              style={{ borderRadius: '0 !important' }}
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

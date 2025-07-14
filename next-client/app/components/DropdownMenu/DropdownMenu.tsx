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
  const [alignRight, setAlignRight] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null); // Ref to track the dropdown element
  const menuRef = useRef<HTMLDivElement>(null); // Ref for the menu itself
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (isOpen && dropdownRef.current && menuRef.current) {
      // Measure the trigger and menu
      const triggerRect = dropdownRef.current.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      // If the menu would overflow right, align right
      if (triggerRect.left + menuRect.width > viewportWidth) {
        setAlignRight(true);
      } else {
        setAlignRight(false);
      }
    }
  }, [isOpen]);

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
        <div
          ref={menuRef}
          className={`absolute mt-1 min-w-max bg-white dark:bg-gray-900/95 text-black dark:text-white border border-black dark:border-white/20 rounded-none shadow-lg font-mono font-bold z-10 p-0 flex flex-col ${alignRight ? 'right-0' : 'left-0'}`}
          style={{ borderRadius: '0 !important' }}
        >
          {options.map((option, idx) => (
            <button
              key={option.label}
              onClick={() => handleOptionClick(option)}
              className={`px-4 py-2 text-left text-black dark:text-white bg-white dark:bg-gray-900 font-mono whitespace-nowrap border-b border-black rounded-none hover:bg-gray-100 dark:hover:bg-gray-800 focus:bg-gray-200 dark:focus:bg-gray-700 ${idx === options.length - 1 ? 'border-b-0' : ''}`}
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

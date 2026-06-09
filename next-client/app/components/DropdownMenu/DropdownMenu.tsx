"use client";

import React, { useEffect, useRef, useState } from "react";
import Button from "../Button";
import { FaCaretDown } from "react-icons/fa";

type DropdownOption = {
  label: string;
  action: () => void;
};

type Props = {
  label?: React.ReactNode; // Allow string or icon
  options: DropdownOption[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIndex: number | null;
  onSelect: (idx: number) => void;
};

const DropdownMenu = ({ label, options, isOpen, onOpenChange, selectedIndex, onSelect }: Props) => {
  const [alignRight, setAlignRight] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null); // Ref to track the dropdown element
  const menuRef = useRef<HTMLDivElement>(null); // Ref for the menu itself
  const toggleDropdown = () => {
    onOpenChange(!isOpen);
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

  const handleOptionClick = (option: DropdownOption, idx: number) => {
    onOpenChange(false); // Close the dropdown after selecting an option
    onSelect(idx);
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
        onOpenChange(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onOpenChange]);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <Button variant="secondary" onClick={toggleDropdown} aria-expanded={isOpen}>
        <span className="flex items-center gap-2">
          {selectedIndex !== null ? options[selectedIndex].label : label}
          <FaCaretDown />
        </span>
      </Button>
      {isOpen && (
        <div
          ref={menuRef}
          className={`absolute mt-2 min-w-[200px] max-w-xs bg-paper-light/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-beige/50 dark:border-neutral-800/50 rounded-2xl shadow-2xl font-sans z-50 p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-200 ${alignRight ? 'right-0' : 'left-0'}`}
        >
          {options.map((option, idx) => (
            <Button
              key={option.label}
              variant="bare"
              onClick={() => handleOptionClick(option, idx)}
              className={`w-full text-left whitespace-nowrap h-10 px-3.5 text-ink-light dark:text-ink-dark hover:bg-paper-softgray/80 dark:hover:bg-paper-dark-surface/80 rounded-xl transition-all duration-150 focus-visible:ring-2 focus-visible:ring-sage hover:text-ink-light dark:hover:text-ink-dark ${selectedIndex === idx ? 'bg-paper-softgray dark:bg-paper-dark-surface font-semibold text-ink-light dark:text-ink-dark' : ''}`}
              tabIndex={0}
            >
              <span className="flex items-center gap-2 w-full text-ui-footnote">
                {option.label}
                {selectedIndex === idx && (
                  <span className="ml-auto text-sage">✓</span>
                )}
              </span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DropdownMenu;

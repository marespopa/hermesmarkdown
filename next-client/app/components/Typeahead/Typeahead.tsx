"use client";

import React, { useState, useRef, useEffect, KeyboardEvent } from "react";
import Input from "../Input";
import Portal from "../Portal";

interface TypeaheadProps {
  name: string;
  label?: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  allowMultiple?: boolean;
  autoFocus?: boolean;
}

export default function Typeahead({
  name,
  label,
  value,
  onChange,
  options,
  placeholder,
  allowMultiple = false,
  autoFocus,
}: TypeaheadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);

  // Extract the current search term for filtering
  const currentSearchTerm = allowMultiple
    ? value.split(",").pop()?.trim() || ""
    : value;

  // Filter options based on current search term, exclude already selected tags if multiple
  const filteredOptions = options.filter((opt) => {
    const matchesSearch = opt.toLowerCase().includes(currentSearchTerm.toLowerCase());
    if (!allowMultiple) return matchesSearch;

    const selectedTags = value.split(",").map((v) => v.trim()).filter(Boolean);
    return matchesSearch && !selectedTags.includes(opt);
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const isInsideContainer = containerRef.current?.contains(target);
      const isInsideDropdown = dropdownRef.current?.contains(target);
      if (!isInsideContainer && !isInsideDropdown) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
  }, [isOpen]);

  const handleSelect = (option: string) => {
    if (allowMultiple) {
      const parts = value.split(",");
      parts.pop(); // Remove the partial term
      const newParts = [...parts.map((p) => p.trim()).filter(Boolean), option];
      onChange(newParts.join(", "));
    } else {
      onChange(option);
    }
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && e.key === "ArrowDown") {
      setIsOpen(true);
      return;
    }

    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filteredOptions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length);
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
        e.preventDefault();
        e.stopPropagation(); // prevent dialog submission if we are selecting an item
        handleSelect(filteredOptions[activeIndex]);
      } else {
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <Input
        name={name}
        label={label}
        value={value}
        handleChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        autoFocus={autoFocus}
      />

      {isOpen && filteredOptions.length > 0 && (
        <Portal>
          <ul ref={dropdownRef} style={dropdownStyle} className="max-h-56 overflow-y-auto bg-paper-light dark:bg-neutral-900 border border-beige dark:border-neutral-800 rounded-xl shadow-xl py-1.5 text-ui-subhead custom-scrollbar">
            {filteredOptions.map((opt, index) => (
              <li
                key={opt}
                onClick={() => handleSelect(opt)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`px-4 py-2.5 cursor-pointer transition-colors ${
                  index === activeIndex
                    ? "bg-sage/10 dark:bg-sage/10 text-sage dark:text-sage font-medium"
                    : "hover:bg-paper-softgray dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200"
                }`}
              >
                {opt}
              </li>
            ))}
          </ul>
        </Portal>
      )}
    </div>
  );
}

import React, { forwardRef, useRef, useImperativeHandle } from "react";
import useIsMobile from "@/app/hooks/use-is-mobile";
import IconButton from "@/app/components/Button";
import Input from "@/app/components/Input";
import { FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";

interface FindBarProps {
  searchTerm: string;
  matchCount: number;
  currentIndex: number;
  onSearch: (term: string) => void;
  onNext: () => void;
  onPrev: () => void;
  onClear: () => void;
  onCollapse: () => void; // new prop
}

const FindBar = forwardRef<HTMLInputElement, FindBarProps>(
  ({
    searchTerm,
    matchCount,
    currentIndex,
    onSearch,
    onNext,
    onPrev,
    onClear,
  }, ref) => {
    const isMobile = useIsMobile();
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);
    if (isMobile) return null;
    return (
      <div className="flex items-center gap-2">
        <Input
          name="find-bar"
          value={searchTerm}
          handleChange={e => onSearch(e.currentTarget.value)}
          placeholder="Find..."
          ref={inputRef}
        />
        {searchTerm && (
          <>
            <span className="text-sm px-1 font-semibold text-amber-600 dark:text-amber-400 select-none whitespace-nowrap">
              {matchCount > 0 ? `${currentIndex + 1} of ${matchCount}` : "0"}
            </span>
            <IconButton
              variant="icon"
              onClick={onPrev}
              aria-label="Previous match"
              label=""
            >
              <FaChevronLeft />
            </IconButton>
            <IconButton
              variant="icon"
              onClick={onNext}
              aria-label="Next match"
              label=""
            >
              <FaChevronRight />
            </IconButton>
            <IconButton
              variant="icon"
              onClick={onClear}
              aria-label="Clear search"
              label=""
            >
              <FaTimes />
            </IconButton>
          </>
        )}
      </div>
    );
  }
);

FindBar.displayName = "FindBar";

export default FindBar; 
import { useCallback, useEffect, useRef, useState } from "react";

type UseFindInEditorOptions = {
  contentEdited: string;
  isMobile: boolean;
};

type UseFindInEditorResult = {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  matchCount: number;
  currentIndex: number;
  setCurrentIndex: (idx: number) => void;
  showFindBar: boolean;
  setShowFindBar: (show: boolean) => void;
  findInputRef: React.RefObject<HTMLInputElement | null>;
  handleNext: () => void;
  handlePrev: () => void;
  handleClear: () => void;
};

export function useFindInEditor({
  contentEdited,
  isMobile,
}: UseFindInEditorOptions): UseFindInEditorResult {
  const [searchTerm, setSearchTerm] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFindBar, setShowFindBar] = useState(false);
  const findInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isMobile) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.userAgent.includes("Mac");
      if (
        (isMac && event.metaKey && event.key === "f") ||
        (!isMac && event.ctrlKey && event.key === "f")
      ) {
        event.preventDefault();
        setShowFindBar(true);
        setTimeout(() => findInputRef.current?.focus(), 0);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobile]);

  useEffect(() => {
    if (searchTerm) setShowFindBar(true);
  }, [searchTerm]);

  useEffect(() => {
    if (showFindBar) {
      findInputRef.current?.focus();
    }
  }, [showFindBar]);

  useEffect(() => {
    if (!searchTerm) {
      setMatchCount(0);
      setCurrentIndex(0);
      return;
    }

    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "gi");
    const matches = [...contentEdited.matchAll(regex)];
    setMatchCount(matches.length);
    if (matches.length === 0) setCurrentIndex(0);
    else if (currentIndex >= matches.length) setCurrentIndex(0);
  }, [searchTerm, contentEdited, currentIndex]);

  const handleNext = useCallback(() => {
    if (matchCount === 0) return;
    setCurrentIndex((prev) => (prev + 1) % matchCount);
  }, [matchCount]);

  const handlePrev = useCallback(() => {
    if (matchCount === 0) return;
    setCurrentIndex((prev) => (prev - 1 + matchCount) % matchCount);
  }, [matchCount]);

  const handleClear = useCallback(() => {
    setSearchTerm("");
    setMatchCount(0);
    setCurrentIndex(0);
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    matchCount,
    currentIndex,
    setCurrentIndex,
    showFindBar,
    setShowFindBar,
    findInputRef,
    handleNext,
    handlePrev,
    handleClear,
  };
}

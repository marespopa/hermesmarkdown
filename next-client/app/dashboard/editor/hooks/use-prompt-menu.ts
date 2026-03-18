import { useCallback, useEffect, useRef, useState } from "react";
import { getCaretCoordinates } from "../utils/caret-measurement";

type MenuPosition = {
  top: number;
  left: number;
  visible: boolean;
};

type UsePromptMenuOptions = {
  contentEdited: string;
  updateCurrentFileContent: (newContent: string) => void;
};

type UsePromptMenuResult = {
  menuPosition: MenuPosition;
  handleTextareaReady: (element: HTMLTextAreaElement | null) => void;
  closePromptMenu: (options?: { removeSlash?: boolean }) => void;
  insertTemplate: (template: string) => void;
};

export function usePromptMenu({
  contentEdited,
  updateCurrentFileContent,
}: UsePromptMenuOptions): UsePromptMenuResult {
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({
    top: 0,
    left: 0,
    visible: false,
  });
  const [slashIndex, setSlashIndex] = useState<number | null>(null);
  const menuVisibleRef = useRef(false);
  const slashIndexRef = useRef<number | null>(null);
  const editorCursorRef = useRef<number | null>(null);
  const contentEditedRef = useRef(contentEdited);
  const updateContentRef = useRef(updateCurrentFileContent);
  const editorTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const textareaElementRef = useRef<HTMLTextAreaElement | null>(null);
  const textareaCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    menuVisibleRef.current = menuPosition.visible;
  }, [menuPosition.visible]);

  useEffect(() => {
    slashIndexRef.current = slashIndex;
  }, [slashIndex]);

  useEffect(() => {
    contentEditedRef.current = contentEdited;
  }, [contentEdited]);

  useEffect(() => {
    updateContentRef.current = updateCurrentFileContent;
  }, [updateCurrentFileContent]);

  const closePromptMenu = useCallback((options?: { removeSlash?: boolean }) => {
    setMenuPosition((prev) => ({ ...prev, visible: false }));
    setSlashIndex(null);

    if (!options?.removeSlash) {
      editorCursorRef.current = null;
      return;
    }

    const activeSlashIndex = slashIndexRef.current;
    if (activeSlashIndex === null) return;

    const textarea = editorTextareaRef.current;
    const value = textarea?.value ?? contentEditedRef.current;

    if (
      activeSlashIndex < 0 ||
      activeSlashIndex >= value.length ||
      value[activeSlashIndex] !== "/"
    ) {
      return;
    }

    const nextValue = `${value.slice(0, activeSlashIndex)}${value.slice(activeSlashIndex + 1)}`;
    updateContentRef.current(nextValue);

    const restoreCursor = () => {
      const targetTextarea =
        textarea ?? (document.getElementById("markdown-editor") as HTMLTextAreaElement | null);
      if (!targetTextarea) return;
      const storedCursor = editorCursorRef.current;
      const baseCursor = storedCursor ?? activeSlashIndex;
      const cursorAfterRemoval = baseCursor > activeSlashIndex ? baseCursor - 1 : baseCursor;
      const cursor = Math.min(Math.max(cursorAfterRemoval, 0), nextValue.length);
      targetTextarea.focus({ preventScroll: true });
      targetTextarea.setSelectionRange(cursor, cursor);
    };

    requestAnimationFrame(() => {
      restoreCursor();
      setTimeout(restoreCursor, 0);
      setTimeout(restoreCursor, 50);
    });
    editorCursorRef.current = null;
  }, []);

  useEffect(() => {
    if (!menuPosition.visible) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closePromptMenu({ removeSlash: true });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuPosition.visible, closePromptMenu]);

  const handleTextareaReady = useCallback((element: HTMLTextAreaElement | null) => {
    if (textareaElementRef.current === element) return;

    if (textareaCleanupRef.current) {
      textareaCleanupRef.current();
      textareaCleanupRef.current = null;
    }

    textareaElementRef.current = element;
    editorTextareaRef.current = element;

    if (!element) {
      setMenuPosition((prev) => ({ ...prev, visible: false }));
      setSlashIndex(null);
      return;
    }

    const updateMenuPosition = (cursorPosition?: number) => {
      const pos = cursorPosition ?? (element.selectionStart ?? 0);
      const coordinates = getCaretCoordinates(element, pos);
      const rect = element.getBoundingClientRect();
      
      const MENU_HEIGHT = 300; // Approximate height of the menu
      const OFFSET = 8; // Gap between cursor and menu
      const cursorScreenY = rect.top + coordinates.top - element.scrollTop;
      const spaceBelow = window.innerHeight - cursorScreenY;
      
      // If not enough space below, position above the cursor
      const top = spaceBelow > MENU_HEIGHT 
        ? cursorScreenY + OFFSET 
        : cursorScreenY - MENU_HEIGHT - OFFSET;
      
      setMenuPosition({
        top,
        left: rect.left + coordinates.left - element.scrollLeft,
        visible: true,
      });
    };

    const handleInput = () => {
      const cursorPosition = element.selectionStart ?? 0;
      const value = element.value;
      const charBefore = cursorPosition > 0 ? value[cursorPosition - 1] : "";
      const charBeforeSlash = cursorPosition > 1 ? value[cursorPosition - 2] : "";
      const lineStart = value.lastIndexOf("\n", cursorPosition - 1);
      const tokenStart = value.lastIndexOf("/", cursorPosition - 1);
      const isTokenValid = tokenStart === lineStart + 1;
      const isSlashAtLineStart = cursorPosition - 1 === lineStart + 1;
      const activeSlashIndex = slashIndexRef.current;

      if (
        menuVisibleRef.current &&
        activeSlashIndex !== null &&
        (activeSlashIndex < 0 || activeSlashIndex >= value.length || value[activeSlashIndex] !== "/")
      ) {
        closePromptMenu();
        return;
      }

      if (charBefore === "/" && charBeforeSlash === "\\") {
        const nextValue = `${value.slice(0, cursorPosition - 2)}/${value.slice(cursorPosition)}`;
        updateContentRef.current(nextValue);
        setMenuPosition((prev) => ({ ...prev, visible: false }));
        setSlashIndex(null);
        requestAnimationFrame(() => {
          element.setSelectionRange(cursorPosition - 1, cursorPosition - 1);
        });
        return;
      }

      if (charBefore === "/" && isSlashAtLineStart) {
        setSlashIndex(cursorPosition - 1);
        editorCursorRef.current = cursorPosition;
        updateMenuPosition(cursorPosition);
        return;
      }

      if (charBefore === "/" && !isSlashAtLineStart) {
        if (menuVisibleRef.current) {
          setMenuPosition((prev) => ({ ...prev, visible: false }));
          setSlashIndex(null);
        }
        return;
      }

      if (menuVisibleRef.current) {
        if (!isTokenValid || activeSlashIndex === null || tokenStart !== activeSlashIndex) {
          setMenuPosition((prev) => ({ ...prev, visible: false }));
          setSlashIndex(null);
          return;
        }
        if (charBefore === " " || charBefore === "\n") {
          setMenuPosition((prev) => ({ ...prev, visible: false }));
          setSlashIndex(null);
          return;
        }
        updateMenuPosition(cursorPosition);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePromptMenu({ removeSlash: menuVisibleRef.current || slashIndexRef.current !== null });
      }
    };

    element.addEventListener("input", handleInput);
    element.addEventListener("keydown", handleKeyDown);

    textareaCleanupRef.current = () => {
      element.removeEventListener("input", handleInput);
      element.removeEventListener("keydown", handleKeyDown);
    };
  }, [closePromptMenu]);

  const insertTemplate = useCallback((template: string) => {
    if (!template) return;
    const textarea = editorTextareaRef.current;
    const activeSlashIndex = slashIndexRef.current;
    const value = contentEditedRef.current;

    if (textarea && activeSlashIndex !== null) {
      const before = value.slice(0, activeSlashIndex);
      const after = value.slice(activeSlashIndex + 1);
      const nextValue = `${before}${template}${after}`;
      updateContentRef.current(nextValue);
      setMenuPosition((prev) => ({ ...prev, visible: false }));
      setSlashIndex(null);

      requestAnimationFrame(() => {
        const cursor = activeSlashIndex;
        textarea.focus();
        textarea.setSelectionRange(cursor, cursor);
      });
      return;
    }

    if (!textarea) {
      const separator = value ? "\n\n" : "";
      updateContentRef.current(`${value}${separator}${template}`);
      return;
    }

    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? start;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const nextValue = `${before}${template}${after}`;
    updateContentRef.current(nextValue);

    requestAnimationFrame(() => {
      const cursor = start;
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  }, []);

  return {
    menuPosition,
    handleTextareaReady,
    closePromptMenu,
    insertTemplate,
  };
}

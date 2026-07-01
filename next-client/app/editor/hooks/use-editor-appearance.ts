"use client";

import { useState, useEffect, useMemo } from "react";
import { useAtomValue } from "jotai";
import {
  atom_fontSize,
  atom_fontFamily,
  atom_editorWidth,
  atom_lineHeight,
  atom_letterSpacing,
} from "@/app/atoms/atoms";

export function useEditorAppearance(isSplit = false) {
  const fontFamily = useAtomValue(atom_fontFamily);
  const fontSize = useAtomValue(atom_fontSize);
  const editorWidth = useAtomValue(atom_editorWidth);
  const lineHeight = useAtomValue(atom_lineHeight);
  const letterSpacing = useAtomValue(atom_letterSpacing);

  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200,
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const displayFontSize = useMemo(() => {
    return fontSize;
  }, [fontSize]);

  const widthClass = useMemo(() => {
    const widthClasses = {
      standard: "w-full md:max-w-[760px] xl:max-w-[860px] mx-auto",
      narrow: "w-full md:max-w-[600px] mx-auto",
    };
    return (widthClasses as any)[editorWidth] || widthClasses.standard;
  }, [editorWidth]);

  // md:px-0 relies on the *window* crossing the md breakpoint, but a split
  // pane can be narrower than that while the window itself is still wide —
  // so the padding would vanish and long lines run to the pane's edge.
  // Split panes keep the sm padding at every width instead of dropping it.
  const paddingClass = isSplit ? "px-4 sm:px-6" : "px-4 sm:px-6 md:px-0";

  return {
    fontFamily,
    displayFontSize,
    lineHeight,
    letterSpacing,
    windowWidth,
    widthClass,
    paddingClass,
  };
}

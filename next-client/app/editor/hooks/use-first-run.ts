"use client";

import { useEffect, useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { atom_renderedFontSize } from "@/app/atoms/atoms";
import { atom_fullWidth, atom_hasCompletedOnboarding } from "@/app/atoms/ui-atoms";
import { atom_isVaultRestoring } from "@/app/atoms/vault-atoms";
import { showHintToast } from "@/app/components/Toastr";
import { formatShortcut } from "@/app/utils/platform";

// "Medium" in Settings → Appearance → Text size.
export const FIRST_RUN_TEXT_SIZE = "17px";

const isStored = (key: string) => {
  try {
    return window.localStorage.getItem(key) !== null;
  } catch {
    // Storage unavailable: treat it as set, so nothing is changed.
    return true;
  }
};

// Read straight from storage, not the atom: a stored atom starts at its
// default for a moment, which would make every visit look like the first.
export function isFirstRun() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("hasCompletedOnboarding") !== "true";
  } catch {
    return false;
  }
}

// The first visit has no setup screens: it lands on the home feed
// (useVaultOpenBehavior), like any visit with no vault, and useWelcomeNote
// then opens the Welcome draft over it. Once the
// saved vault has had its chance to restore, this applies the first-run
// defaults (Medium text, full width) unless they are already stored, shows
// the command palette shortcut once, and records that the visit happened.
// Where the notes live is asked later, by FolderPrompt.
export function useFirstRun(isMobileChrome: boolean) {
  const [firstRun] = useState(isFirstRun);
  const isVaultRestoring = useAtomValue(atom_isVaultRestoring);
  const setHasCompleted = useSetAtom(atom_hasCompletedOnboarding);
  const setRenderedFontSize = useSetAtom(atom_renderedFontSize);
  const setFullWidth = useSetAtom(atom_fullWidth);
  // A ref, not state: React's development double run of effects replays
  // this one before a state update lands, which showed the hint twice.
  const done = useRef(false);

  useEffect(() => {
    if (!firstRun || done.current || isVaultRestoring) return;
    done.current = true;
    setHasCompleted(true);
    if (!isStored("renderedFontSize")) setRenderedFontSize(FIRST_RUN_TEXT_SIZE);
    if (!isStored("fullWidth")) setFullWidth(true);
    showHintToast(
      isMobileChrome
        ? "Tap the menu button anytime to open the command palette."
        : `Press ${formatShortcut("k")} anytime to open the command palette.`,
    );
  }, [firstRun, isVaultRestoring, isMobileChrome, setHasCompleted, setRenderedFontSize, setFullWidth]);
}

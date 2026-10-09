"use client";

import { useLayoutEffect, useRef } from "react";

const VIEW_PARAM = "view";
const HOME_VIEW = "home";

// Mirrors the home feed's open state in the URL as `?view=home`, so the feed
// can be linked to and survives a refresh. The feed stays a view of the
// editor page (no route change, no remount): the URL is rewritten in place
// with history.replaceState, which the App Router keeps in sync with
// useSearchParams. On mount, `?view=home` opens the feed; after that the
// atom leads. The URL isn't touched until a vault is open, so a deep link
// survives the vault restore. A layout effect, so a refresh on the feed
// opens it before the first paint instead of flashing the workspace.
export function useHomeFeedUrlSync(isOpen: boolean, hasVault: boolean, setIsOpen: (open: boolean) => void) {
  const hasReadUrlRef = useRef(false);

  useLayoutEffect(() => {
    const url = new URL(window.location.href);
    if (!hasReadUrlRef.current) {
      hasReadUrlRef.current = true;
      if (url.searchParams.get(VIEW_PARAM) === HOME_VIEW && !isOpen) {
        setIsOpen(true);
        return;
      }
    }
    if (!hasVault) return;
    const isHomeInUrl = url.searchParams.get(VIEW_PARAM) === HOME_VIEW;
    if (isOpen === isHomeInUrl) return;
    if (isOpen) url.searchParams.set(VIEW_PARAM, HOME_VIEW);
    else url.searchParams.delete(VIEW_PARAM);
    window.history.replaceState(window.history.state, "", url);
  }, [isOpen, hasVault, setIsOpen]);
}

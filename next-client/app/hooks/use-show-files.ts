import { useCallback } from "react";
import { useSetAtom } from "jotai";
import { usePathname, useRouter } from "next/navigation";
import { atom_showFiles } from "@/app/atoms/ui-atoms";
import { atom_mobileDrawerOpen } from "@/app/atoms/mobile-drawer-atoms";
import useIsMobileChrome from "./use-mobile-chrome";

// "Show Files" (command palette, Ctrl/Cmd+Shift+E). Desktop: shows the
// sidebar and focuses its Files tree (atom_showFiles) where you are on any
// /editor route (every one has the sidebar), coming to the editor first
// from anywhere else. Mobile has no sidebar, so it opens the navigation
// drawer. `navigate` lets the editor page route through its
// unsaved-changes guard; router.push otherwise.
export function useShowFiles(navigate?: (path: string) => void) {
  const router = useRouter();
  const pathname = usePathname();
  const isMobileChrome = useIsMobileChrome();
  const showFiles = useSetAtom(atom_showFiles);
  const setDrawerOpen = useSetAtom(atom_mobileDrawerOpen);

  return useCallback(() => {
    const go = navigate ?? ((path: string) => router.push(path));
    if (isMobileChrome) {
      setDrawerOpen(true);
      return;
    }
    showFiles();
    if (!pathname?.startsWith("/editor")) go("/editor");
  }, [isMobileChrome, navigate, pathname, router, showFiles, setDrawerOpen]);
}

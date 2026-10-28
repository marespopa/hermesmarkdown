import { useCallback } from "react";
import { useSetAtom } from "jotai";
import { usePathname, useRouter } from "next/navigation";
import { atom_showFiles } from "@/app/atoms/ui-atoms";
import { atom_mobileDrawerOpen, atom_mobileDrawerTab } from "@/app/atoms/mobile-drawer-atoms";
import useIsMobileChrome from "./use-mobile-chrome";

// "Show Files" (command palette, Ctrl/Cmd+Shift+E). Desktop: shows the
// sidebar and focuses its Files tree (atom_showFiles) where you are on any
// /editor route (every one has the sidebar), coming to the editor first
// from anywhere else. Mobile has no sidebar, so it opens the navigation
// drawer on its Files tab. `navigate` lets the editor page route through its
// unsaved-changes guard; router.push otherwise.
export function useShowFiles(navigate?: (path: string) => void) {
  const router = useRouter();
  const pathname = usePathname();
  const isMobileChrome = useIsMobileChrome();
  const showFiles = useSetAtom(atom_showFiles);
  const setDrawerOpen = useSetAtom(atom_mobileDrawerOpen);
  const setDrawerTab = useSetAtom(atom_mobileDrawerTab);

  return useCallback(() => {
    const go = navigate ?? ((path: string) => router.push(path));
    if (isMobileChrome) {
      setDrawerTab("files");
      setDrawerOpen(true);
      return;
    }
    showFiles();
    if (!pathname?.startsWith("/editor")) go("/editor");
  }, [isMobileChrome, navigate, pathname, router, showFiles, setDrawerOpen, setDrawerTab]);
}

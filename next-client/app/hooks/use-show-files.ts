import { useCallback } from "react";
import { useSetAtom } from "jotai";
import { usePathname, useRouter } from "next/navigation";
import { atom_showFiles } from "@/app/atoms/ui-atoms";
import useIsMobileChrome from "./use-mobile-chrome";

// "Show Files" (command palette, Ctrl/Cmd+Shift+E). Desktop: shows the
// sidebar and focuses its Files tree (atom_showFiles), coming back to the
// editor first from any other route. Mobile has no sidebar, so it opens the
// full-screen Files page (/editor/files). `navigate` lets the editor page
// route through its unsaved-changes guard; router.push otherwise.
export function useShowFiles(navigate?: (path: string) => void) {
  const router = useRouter();
  const pathname = usePathname();
  const isMobileChrome = useIsMobileChrome();
  const showFiles = useSetAtom(atom_showFiles);

  return useCallback(() => {
    const go = navigate ?? ((path: string) => router.push(path));
    if (isMobileChrome) {
      go("/editor/files");
      return;
    }
    showFiles();
    if (pathname !== "/editor") go("/editor");
  }, [isMobileChrome, navigate, pathname, router, showFiles]);
}

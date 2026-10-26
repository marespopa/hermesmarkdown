"use client";

import { useCallback, useRef } from "react";
import { useStore } from "jotai";
import { useRouter } from "next/navigation";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { showErrorToast } from "@/app/components/Toastr";
import { useSidebarNavigation } from "./use-sidebar-navigation";

// A place to come back to: the note in front, or the route (Tasks, a tag…).
type Place = { kind: "note"; path: string } | { kind: "route"; href: string };

const samePlace = (a: Place, b: Place) =>
  a.kind === "note" ? b.kind === "note" && a.path === b.path : b.kind === "route" && a.href === b.href;

// Ctrl/Cmd+0, the way back from a Ctrl/Cmd+1–9 jump: `remember` keeps the
// place in front just before the jump, `goBack` returns to it and keeps the
// place it left, so pressing it again goes back to the pin (a toggle
// between the two). `activePath` is the note in front on the editor (null
// elsewhere). Kept in memory only, for this window.
export function usePinReturn(activePath: string | null) {
  const store = useStore();
  const router = useRouter();
  const { openHandle } = useSidebarNavigation();
  const back = useRef<Place | null>(null);

  const here = useCallback((): Place => (
    activePath ? { kind: "note", path: activePath } : { kind: "route", href: window.location.pathname + window.location.search }
  ), [activePath]);

  const remember = useCallback(() => { back.current = here(); }, [here]);

  // False when there's nowhere to go back to (the key is left alone).
  const goBack = useCallback((): boolean => {
    const place = back.current;
    if (!place) return false;
    const from = here();
    if (samePlace(place, from)) return true;
    if (place.kind === "route") {
      back.current = from;
      router.push(place.href);
      return true;
    }
    const handle = store.get(atom_fileMetadata)[place.path]?.handle as FileSystemFileHandle | null | undefined;
    if (!handle) {
      back.current = null;
      showErrorToast(`“${place.path.split("/").pop()}” isn't in this vault any more.`);
      return true;
    }
    back.current = from;
    void openHandle(handle, place.path);
    return true;
  }, [here, router, store, openHandle]);

  return { remember, goBack };
}

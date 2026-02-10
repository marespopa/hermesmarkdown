import { useEffect } from "react";

export function useEditorLaunchFlag(storageKey: string, onOpen: () => void) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const flag = window.localStorage.getItem(storageKey);
    if (flag) {
      onOpen();
      window.localStorage.removeItem(storageKey);
    }
  }, [storageKey, onOpen]);
}

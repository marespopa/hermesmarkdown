"use client";

import { useEffect, useRef } from "react";
import { useAtomValue } from "jotai";
import { atom_vaultKey } from "@/app/atoms/vault-atoms";

// A soft fade for what a vault switch replaces (the page, the sidebar's lists):
// the ref'd element replays `.vault-switch-in` each time the open vault changes,
// not on first load or a close. Opacity only, so nothing moves or reflows.
export function useVaultSwitchFade<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const vaultKey = useAtomValue(atom_vaultKey);
  const previous = useRef<string | null>(vaultKey);

  useEffect(() => {
    const element = ref.current;
    const from = previous.current;
    previous.current = vaultKey;
    if (!element || !from || !vaultKey || from === vaultKey) return;
    element.classList.remove("vault-switch-in");
    void element.offsetWidth; // restart the animation
    element.classList.add("vault-switch-in");
    const done = () => element.classList.remove("vault-switch-in");
    element.addEventListener("animationend", done, { once: true });
    return () => element.removeEventListener("animationend", done);
  }, [vaultKey]);

  return ref;
}

import { atom } from "jotai";

export type MobileDrawerTab = "files" | "tags";

// The phone's navigation drawer (MobileDrawer): open or not, and the tab last
// shown. In memory only: it always starts closed.
export const atom_mobileDrawerOpen = atom<boolean>(false);
export const atom_mobileDrawerTab = atom<MobileDrawerTab>("files");
// The right-hand Outline & metrics drawer (MobileOutlineDrawer).
export const atom_mobileOutlineOpen = atom<boolean>(false);

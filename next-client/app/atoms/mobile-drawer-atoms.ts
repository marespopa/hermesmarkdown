import { atom } from "jotai";

// The phone's navigation drawer (MobileDrawer): open or not. In memory only: it always starts closed.
export const atom_mobileDrawerOpen = atom<boolean>(false);
// The right-hand Outline & metrics drawer (MobileOutlineDrawer).
export const atom_mobileOutlineOpen = atom<boolean>(false);

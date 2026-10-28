import { atom_mobileDrawerTab, type MobileDrawerTab } from "./mobile-drawer-atoms";

// The sidebar's two views (WorkspaceSidebar): Files, the vault's folder
// tree, and Tags, the same notes filed by #tag (sidebar/SidebarTags.tsx).
// The phone drawer's tab is the same atom, so the sidebar and the drawer
// show the same view, and switching back leaves the other one as it was.
export type SidebarTab = MobileDrawerTab;

export const atom_activeSidebarTab = atom_mobileDrawerTab;

// Quiet rows: 28px, the primary text colour at regular weight, neutral grey
// icons, and the current row on a soft accent fill (the file tree's active
// row, FileRow), so every row highlights alike. The accent is kept for the
// caret, focus and the selection; nothing else in the sidebar is coloured.
export const SIDEBAR_ITEM_CLASS = "flex items-center gap-2 h-7 px-2 rounded-md text-ui-footnote text-left transition-colors";
// The file tree's active-row fill (FileRow), so both highlight alike.
export const SIDEBAR_ACCENT_FILL = "bg-accent/15";
export const SIDEBAR_ITEM_CURRENT_CLASS = `${SIDEBAR_ACCENT_FILL} text-fg`;
export const SIDEBAR_ITEM_IDLE_CLASS = "text-fg hover:bg-black/[0.04] dark:hover:bg-white/[0.06]";

export const sidebarItemClass = (isCurrent: boolean) =>
  `${SIDEBAR_ITEM_CLASS} ${isCurrent ? SIDEBAR_ITEM_CURRENT_CLASS : SIDEBAR_ITEM_IDLE_CLASS}`;

// A row's leading glyph: neutral, never coloured.
export const SIDEBAR_ICON_CLASS = "shrink-0 text-fg-faint";

// The small icon buttons in the header and footer: quiet until hovered.
export const SIDEBAR_ICON_BUTTON_CLASS =
  "shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md text-fg-faint transition-colors hover:text-fg hover:bg-black/[0.05] dark:hover:bg-white/[0.08]";

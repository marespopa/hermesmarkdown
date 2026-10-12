// One look for every pop-up menu (TabContextMenu: tab and toolbar menus, the
// sidebar's section menus, the Tasks page's menus; the file tree's
// TreeContextMenu): a frosted panel with a soft, deep shadow, compact rows
// highlighted by a quiet fill on hover and keyboard focus alike, hairline
// separators inset from the edges. Static black / white fills, which take
// opacity (the var-backed surface tokens drop the modifier).
export const MENU_PANEL_CLASS = [
  "fixed z-50 p-1 flex flex-col gap-px font-sans rounded-xl",
  "bg-paper-light/90 dark:bg-paper-dark/90 backdrop-blur-xl backdrop-saturate-150",
  "border border-edge-subtle",
  "shadow-[0_12px_32px_-8px_rgb(0_0_0/0.20),0_2px_6px_-1px_rgb(0_0_0/0.08)]",
  "dark:shadow-[0_12px_32px_-8px_rgb(0_0_0/0.55),0_2px_6px_-1px_rgb(0_0_0/0.3)]",
].join(" ");

// A row: unstyled Button plus this. The shared focus ring is swapped for the
// highlight fill, so the keyboard and the pointer show the same thing.
// Literal class names throughout, so Tailwind keeps them.
export const MENU_ITEM_CLASS = [
  "w-full flex items-center gap-2.5 h-8 px-2.5 rounded-lg [@media(pointer:coarse)]:h-10",
  "text-left text-ui-footnote text-ink-light dark:text-ink-dark",
  "outline-none focus-visible:!ring-0 focus-visible:!ring-offset-0 transition-colors duration-100",
  "hover:bg-black/[0.05] dark:hover:bg-white/[0.08] focus-visible:bg-black/[0.05] dark:focus-visible:bg-white/[0.08]",
  "disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed",
].join(" ");

// A destructive row (Move to Trash): red text, red-tinted highlight.
export const MENU_ITEM_DESTRUCTIVE_CLASS = "!text-red-600 dark:!text-red-400 hover:!bg-red-500/10 focus-visible:!bg-red-500/10";

export const MENU_SEPARATOR_CLASS = "my-1 mx-2 h-px bg-edge-subtle";

// A row's leading icon and trailing shortcut.
export const MENU_ICON_CLASS = "shrink-0 w-4 flex justify-center text-fg-muted";
export const MENU_SHORTCUT_CLASS = "shrink-0 ml-4 text-ui-caption text-fg-faint tabular-nums";

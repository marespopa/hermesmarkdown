// One look for every pop-up menu (TabContextMenu: tab and toolbar menus, the
// sidebar's section menus, the Tasks page's menus; the file tree's
// TreeContextMenu): the panel material (`.glass-panel`), compact rows
// highlighted by a quiet fill on hover and keyboard focus alike, hairline
// separators inset from the edges. Static black / white fills, which take
// opacity (the var-backed surface tokens drop the modifier).
export const MENU_PANEL_CLASS = [
  "fixed z-50 p-1 flex flex-col gap-px font-sans rounded-xl glass-panel",
].join(" ");

// A row is `<Button variant="menu-row">`: compact, a quiet fill on hover
// and keyboard focus alike (the focus ring swapped for it).

// A destructive row (Move to Trash): the palette's warm red (--danger), with
// a highlight tinted by it.
export const MENU_ITEM_DESTRUCTIVE_CLASS =
  "!text-danger hover:!bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] focus-visible:!bg-[color-mix(in_srgb,var(--danger)_10%,transparent)]";

export const MENU_SEPARATOR_CLASS = "my-1 mx-2 h-px bg-edge-subtle";

// A row's leading icon and trailing shortcut.
export const MENU_ICON_CLASS = "shrink-0 w-4 flex justify-center text-fg-muted";
export const MENU_SHORTCUT_CLASS = "shrink-0 ml-4 text-ui-caption text-fg-faint tabular-nums";

// Shared look of the window's small controls: the page title bars
// (ShellPage) and the sidebar's header share this height, and the corner
// buttons (Show sidebar) use the sections and buttons below.
export const PANE_HEADER_HEIGHT = "h-11";

// One toolbar section: a borderless capsule holding related controls, on a
// subtle translucent fill (static black / white, which do take opacity — the
// surface tokens are too close to the chrome to show a group). Sections are
// set apart by space, not dividers.
export const PANE_SECTION_CLASS = "flex items-center gap-0.5 p-0.5 ml-2 shrink-0 h-8 rounded-full bg-black/[0.05] dark:bg-white/[0.07] z-20";

// Hover, keyboard focus and the pressed / open state all use one look: a raised surface pill with a soft
// shadow and hairline ring, riding on the section's fill.
const RAISED = "bg-surface shadow-sm ring-1 ring-black/5 text-fg";
const BUTTON_BASE = [
  "flex items-center justify-center text-fg-muted transition-[color,background-color,box-shadow] duration-200",
  "hover:bg-surface hover:shadow-sm hover:ring-1 hover:ring-black/5 hover:text-fg",
  // Keyboard focus adds a hairline accent ring (no offset; `sage` is var-backed,
  // so no opacity modifier) over the Button's default thicker one.
  "focus-visible:bg-surface focus-visible:shadow-sm focus-visible:text-fg focus-visible:!ring-1 focus-visible:!ring-sage focus-visible:!ring-offset-0",
  "disabled:opacity-40 disabled:pointer-events-none",
].join(" ");
export const PANE_ACTION_BUTTON_CLASS = `${BUTTON_BASE} w-7 h-7 rounded-full`;
// Pressed / open state for a toggle or menu button in a section.
export const PANE_ACTION_ACTIVE_CLASS = RAISED;
// A square button in the SearchPill's look (same height, tint and rounding):
// Copy Contents in the editor's corner.
export const PILL_BUTTON_CLASS = "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/[0.05] text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sage disabled:opacity-40 disabled:hover:text-fg-muted dark:bg-white/[0.07]";

// One glyph size for every pane-header icon.
export const PANE_ICON_SIZE = 16;

// The SearchPill's height plus its offset from the top (top-1.5, h-8): room
// kept above the pane's text.
export const PANE_TOP_ROOM = "48px";
export const PANE_TOP_ROOM_PX = 48;

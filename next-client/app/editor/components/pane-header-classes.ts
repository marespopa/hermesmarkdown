// Shared look of the pane header (tab strip row and its toolbar sections).
// The header takes a solid token fill — opacity modifiers don't work on the
// var-backed colors (Tailwind drops the class). A hairline closes it; the
// editor below is its own paper panel on the chrome.
export const PANE_HEADER_CLASS = "flex items-center bg-chrome border-b border-edge-subtle shrink-0 relative z-20 px-2 sm:px-3";
// Header height, and the matching negative margin that slides it under the
// pane's top edge when the toolbar is hidden.
export const PANE_HEADER_HEIGHT = "h-11";
export const PANE_HEADER_HIDDEN = "-mt-11";

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
// One glyph size for every pane-header icon.
export const PANE_ICON_SIZE = 16;

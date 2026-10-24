// The one text-field look, as on iOS: the gray control fill (--fill), no
// border, a 10px radius; focus adds a soft accent ring. Shared by `Input`,
// `Textarea`, `Select` and every `BareInput` that is a field of its own
// (search boxes, settings rows, popover filters). In-place rename fields and
// the command palette's bar keep their own look.
export const FIELD_SURFACE =
  "bg-fill text-fg placeholder:text-fg-faint outline-none focus-visible:outline-none " +
  "transition-[background-color,box-shadow] duration-150 ease-out " +
  "focus:ring-2 focus:ring-accent/25 disabled:opacity-50 disabled:cursor-not-allowed " +
  "[color-scheme:light] dark:[color-scheme:dark]";

/** A form field: 44px tall, for dialogs and forms. Add `w-full` or a width. */
export const FIELD_CLASS = `${FIELD_SURFACE} h-11 rounded-[10px] px-3.5 text-ui-subhead`;

/** A compact field: 32px tall, for settings rows, toolbars and popovers. */
export const FIELD_COMPACT_CLASS = `${FIELD_SURFACE} h-8 rounded-lg px-2.5 text-ui-footnote`;

/** A sidebar field: 28px tall and rounded like the sidebar's rows, so it sits in their rhythm. */
export const FIELD_SIDEBAR_CLASS = `${FIELD_SURFACE} h-7 rounded-md px-2 text-ui-footnote`;

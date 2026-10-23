import React, { ReactNode } from "react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "outlined"
  | "icon"
  | "tertiary"
  | "hero"
  | "warning"
  | "bare"
  | "pill-icon"
  | "menu-item"
  // A compact row in a pop-up menu (tab, file tree, sidebar and Tasks menus).
  | "menu-row"
  // One option of a segmented control; selected via aria-pressed or
  // aria-selected (a tab), so the state is in the markup, not a class.
  | "segment"
  // The round × that closes a dialog, menu or toast.
  | "close"
  // A small plain text button (32px): toolbar and row actions, toasts.
  | "small"
  // A small square icon button (28px): headers, rows, popovers.
  | "icon-small"
  // No visual styling beyond the shared focus ring: for bespoke controls that
  // style themselves entirely through `className`.
  | "unstyled";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: ReactNode;
  variant: ButtonVariant;
  label?: string | ReactNode;
  className?: string;
  isDisabled?: boolean;
};

const Button = React.forwardRef<HTMLButtonElement, Props>(function Button(
  { variant, label, children, className = "", isDisabled = false, onClick, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      onClick={(e) => {
        if (onClick) {
          onClick(e);
        }
      }}
      disabled={isDisabled}
      {...rest}
      className={`${variantStyles(variant)} ${className}`}
    >
      {children || label}
    </button>
  );
});

export default Button;

// iOS-style controls: filled, borderless, flat. Hover and press deepen the
// fill; nothing lifts or scales, and only colour properties transition. One
// radius scale: rounded-xl (12px) for full-size buttons, rounded-[10px] for
// compact ones and fields, rounded-lg for menu rows, rounded-full for round
// icon buttons, the close button and tags.
const TRANSITION = "transition-[color,background-color,border-color,opacity,box-shadow] duration-150 ease-out";
const FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 focus-visible:ring-offset-surface";
const DISABLED = "disabled:opacity-30 disabled:pointer-events-none";

const baseStyles =
  `flex items-center justify-center gap-2 ${TRANSITION} ${FOCUS_RING} ${DISABLED} select-none font-sans font-semibold`;
// A full-size button: 44px, the iOS minimum target.
const LARGE = "h-11 px-5 rounded-xl text-ui-subhead";

// On touch screens, small controls take a 44px hit area without changing
// their footprint: padding grows and a negative margin gives it back.
const COARSE_ICON = "[@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:-m-0.5";
const COARSE_PILL_ICON = "[@media(pointer:coarse)]:p-3.5 [@media(pointer:coarse)]:-m-2.5";
const COARSE_ICON_SMALL = "[@media(pointer:coarse)]:w-10 [@media(pointer:coarse)]:h-10 [@media(pointer:coarse)]:-m-1.5";
const COARSE_CLOSE = "[@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:-m-2";

// Hover and press fills. Ink and danger fills mix toward the page colour
// (lighter in light mode, dimmer in dark); gray controls take the next
// fill step (--fill-hover, --fill-press). Literal class names throughout, so
// Tailwind keeps them.
const INK_HOVER =
  "hover:bg-[color-mix(in_srgb,var(--fg)_80%,var(--surface))] active:bg-[color-mix(in_srgb,var(--fg)_68%,var(--surface))]";
const DANGER_HOVER =
  "hover:bg-[color-mix(in_srgb,var(--danger)_82%,var(--surface))] active:bg-[color-mix(in_srgb,var(--danger)_70%,var(--surface))]";
const FILL_HOVER = "hover:bg-fill-hover active:bg-fill-press";
// Plain controls (no fill at rest) take the gray fill on hover.
const QUIET_HOVER = "hover:bg-fill active:bg-fill-hover";

// The track a row of `segment` buttons sits in: the gray fill, the selected
// segment raised on it.
export const SEGMENT_TRACK_CLASS = "rounded-[9px] bg-fill p-0.5";

// Only an unselected segment takes the hover fill; the selected one keeps
// its raised look.
const SEGMENT_HOVER = "aria-[pressed=false]:hover:bg-fill aria-[selected=false]:hover:bg-fill";

const variantStyles = (variant: ButtonVariant): string => {
  switch (variant) {
    case "hero":
      // As primary, larger: ink on paper. The accent is kept for the caret,
      // focus and selections.
      return `${baseStyles} h-12 px-7 rounded-xl text-ui-body bg-fg text-surface ${INK_HOVER}`;

    case "primary":
      // Filled: the text colour as the fill, the page colour as the label,
      // in every theme and mode.
      return `${baseStyles} ${LARGE} bg-fg text-surface ${INK_HOVER}`;

    case "warning":
      // Destructive: each palette's own warm red (--danger), the page colour
      // as the label.
      return `${baseStyles} ${LARGE} bg-danger text-surface ${DANGER_HOVER}`;

    case "secondary":
      // Gray: the control fill, ink label.
      return `${baseStyles} ${LARGE} bg-fill text-fg ${FILL_HOVER}`;

    case "outlined":
      // Gray with a muted label: the quieter of two actions (Cancel).
      return `${baseStyles} ${LARGE} px-4 font-medium bg-fill text-fg-muted hover:text-fg ${FILL_HOVER}`;

    case "icon":
      return `${baseStyles} w-10 h-10 p-0 bg-transparent text-fg-muted hover:text-fg ${QUIET_HOVER} rounded-full ${COARSE_ICON}`;

    case "tertiary":
      // Plain: text only, the fill on hover.
      return `${baseStyles} ${LARGE} px-3 bg-transparent text-fg-muted hover:text-fg ${QUIET_HOVER}`;

    case "bare":
      // Underlined on hover and keyboard focus (not on a mouse click's focus).
      return `inline-flex items-center justify-center font-sans font-medium text-ui-footnote hover:underline focus-visible:underline ${FOCUS_RING} rounded ${TRANSITION}`;

    case "menu-item":
      return `w-full inline-flex items-center justify-start gap-3 px-3 py-2.5 font-sans font-medium text-ui-footnote text-fg-muted hover:text-fg ${QUIET_HOVER} ${TRANSITION} rounded-lg group ${FOCUS_RING} ${DISABLED} select-none`;

    case "menu-row":
      // The shared focus ring is swapped for the highlight fill, so the
      // keyboard and the pointer show the same thing.
      return `w-full flex items-center gap-2.5 h-8 px-2.5 rounded-lg [@media(pointer:coarse)]:h-10 text-left font-sans text-ui-footnote text-fg outline-none ${TRANSITION} ${QUIET_HOVER} focus-visible:bg-fill disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed`;

    case "segment":
      // Selected: raised on the track (SEGMENT_TRACK_CLASS), as on iOS.
      return `flex min-w-0 items-center justify-center gap-1 h-7 px-3 rounded-[7px] [@media(pointer:coarse)]:h-9 font-sans text-ui-footnote font-medium select-none text-fg-muted hover:text-fg ${SEGMENT_HOVER} aria-pressed:bg-overlay aria-pressed:text-fg aria-pressed:shadow-sm aria-selected:bg-overlay aria-selected:text-fg aria-selected:shadow-sm ${TRANSITION} ${FOCUS_RING}`;

    case "close":
      // The round gray × of an iOS sheet.
      return `flex shrink-0 items-center justify-center w-7 h-7 rounded-full bg-fill text-fg-muted hover:text-fg ${FILL_HOVER} ${TRANSITION} ${FOCUS_RING} ${COARSE_CLOSE}`;

    case "small":
      return `inline-flex shrink-0 items-center justify-center gap-1.5 h-8 px-2.5 rounded-lg font-sans text-ui-footnote font-medium text-fg-muted hover:text-fg ${QUIET_HOVER} ${TRANSITION} ${FOCUS_RING} ${DISABLED} select-none`;

    case "icon-small":
      return `flex shrink-0 items-center justify-center w-7 h-7 rounded-lg text-fg-muted hover:text-fg ${QUIET_HOVER} ${TRANSITION} ${FOCUS_RING} ${DISABLED} select-none ${COARSE_ICON_SMALL}`;

    case "pill-icon":
      return `flex items-center justify-center p-1 text-fg-muted hover:text-fg ${QUIET_HOVER} ${TRANSITION} rounded-md ${FOCUS_RING} ${DISABLED} select-none ${COARSE_PILL_ICON}`;

    case "unstyled":
      return FOCUS_RING;

    default:
      return baseStyles;
  }
};

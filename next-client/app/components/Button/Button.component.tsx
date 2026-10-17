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

// Flat, as the rest of the app: hover changes a fill or the text colour,
// never lifts or scales. Only colour properties transition.
const TRANSITION = "transition-[color,background-color,border-color,opacity,box-shadow] duration-150 ease-out";
const FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 focus-visible:ring-offset-surface";
const DISABLED = "disabled:opacity-30 disabled:pointer-events-none";

const baseStyles =
  `rounded-2xl flex items-center justify-center gap-2 ${TRANSITION} ${FOCUS_RING} ${DISABLED} select-none border font-sans font-semibold text-ui-footnote sm:text-ui-subhead`;

// On touch screens, small controls take a 44px hit area without changing
// their footprint: padding grows and a negative margin gives it back.
const COARSE_ICON = "[@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:-m-0.5";
const COARSE_PILL_ICON = "[@media(pointer:coarse)]:p-3.5 [@media(pointer:coarse)]:-m-2.5";
const COARSE_CLOSE = "[@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:-m-1.5";

// Hover and press fills, flat but plain to see. Ink and danger fills mix
// toward the page colour (lighter in light mode, dimmer in dark); surface
// fills mix toward the ink. color-mix keeps them right in every palette.
// Literal class names throughout, so Tailwind keeps them.
const INK_HOVER =
  "hover:bg-[color-mix(in_srgb,var(--fg)_80%,var(--surface))] hover:border-[color-mix(in_srgb,var(--fg)_80%,var(--surface))] active:bg-[color-mix(in_srgb,var(--fg)_68%,var(--surface))] active:border-[color-mix(in_srgb,var(--fg)_68%,var(--surface))]";
const DANGER_HOVER =
  "hover:bg-[color-mix(in_srgb,var(--danger)_82%,var(--surface))] hover:border-[color-mix(in_srgb,var(--danger)_82%,var(--surface))] active:bg-[color-mix(in_srgb,var(--danger)_70%,var(--surface))] active:border-[color-mix(in_srgb,var(--danger)_70%,var(--surface))]";
const SURFACE_HOVER =
  "hover:bg-[color-mix(in_srgb,var(--fg)_9%,var(--surface-raised))] hover:border-[color-mix(in_srgb,var(--fg)_28%,var(--surface))] active:bg-[color-mix(in_srgb,var(--fg)_14%,var(--surface-raised))]";
// Quiet fills (static black / white, which take opacity; the var-backed
// surface tokens don't) for rows and round controls.
const QUIET_HOVER =
  "hover:bg-black/[0.06] dark:hover:bg-white/[0.09] active:bg-black/[0.1] dark:active:bg-white/[0.14]";

// Only an unselected segment takes the hover fill; the selected one keeps
// its raised look.
const SEGMENT_HOVER =
  "aria-[pressed=false]:hover:bg-black/[0.06] aria-[selected=false]:hover:bg-black/[0.06] dark:aria-[pressed=false]:hover:bg-white/[0.09] dark:aria-[selected=false]:hover:bg-white/[0.09]";

const variantStyles = (variant: ButtonVariant): string => {
  switch (variant) {
    case "hero":
      // As primary, larger: ink on paper. The accent is kept for the caret,
      // focus and selections.
      return `${baseStyles} h-12 px-8 bg-fg border-fg text-surface ${INK_HOVER}`;

    case "primary":
      // Ink on paper: the text colour as the fill, the page colour as the
      // label, in every theme and mode.
      return `${baseStyles} h-11 px-6 bg-fg border-fg text-surface ${INK_HOVER}`;

    case "warning":
      // Destructive: each palette's own warm red (--danger), the page colour
      // as the label.
      return `${baseStyles} h-11 px-6 bg-danger border-danger text-surface ${DANGER_HOVER}`;

    case "secondary":
      return `${baseStyles} h-11 px-6 bg-surface-raised text-fg border-edge ${SURFACE_HOVER}`;

    case "outlined":
      return `${baseStyles} h-11 px-4 bg-transparent border-edge text-fg-muted hover:text-fg ${SURFACE_HOVER}`;

    case "icon":
      return `${baseStyles} w-10 h-10 p-0 bg-transparent border-none text-fg-muted hover:text-fg ${QUIET_HOVER} rounded-full ${COARSE_ICON}`;

    case "tertiary":
      return `${baseStyles} h-11 px-3 bg-transparent border-none text-fg-muted hover:text-fg ${QUIET_HOVER}`;

    case "bare":
      // Underlined on hover and keyboard focus (not on a mouse click's focus).
      return `inline-flex items-center justify-center font-sans font-medium text-ui-footnote hover:underline focus-visible:underline ${FOCUS_RING} rounded ${TRANSITION}`;

    case "menu-item":
      return `w-full inline-flex items-center justify-start gap-3 px-3 py-2.5 font-sans font-medium text-ui-footnote text-fg-muted hover:text-fg ${QUIET_HOVER} ${TRANSITION} rounded-xl group ${FOCUS_RING} ${DISABLED} select-none`;

    case "menu-row":
      // The shared focus ring is swapped for the highlight fill, so the
      // keyboard and the pointer show the same thing.
      return `w-full flex items-center gap-2.5 h-8 px-2.5 rounded-lg [@media(pointer:coarse)]:h-10 text-left font-sans text-ui-footnote text-ink-light dark:text-ink-dark outline-none ${TRANSITION} ${QUIET_HOVER} focus-visible:bg-black/[0.05] dark:focus-visible:bg-white/[0.08] disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed`;

    case "segment":
      return `flex min-w-0 items-center justify-center gap-1 h-7 px-3 rounded-md [@media(pointer:coarse)]:h-9 font-sans text-ui-footnote font-medium select-none text-fg-muted hover:text-fg ${SEGMENT_HOVER} aria-pressed:bg-paper-light aria-pressed:text-ink-light aria-pressed:shadow-sm aria-selected:bg-paper-light aria-selected:text-ink-light aria-selected:shadow-sm dark:aria-pressed:bg-white/10 dark:aria-pressed:text-ink-dark dark:aria-selected:bg-white/10 dark:aria-selected:text-ink-dark ${TRANSITION} ${FOCUS_RING}`;

    case "close":
      return `flex shrink-0 items-center justify-center w-8 h-8 rounded-full text-fg-muted hover:text-fg ${QUIET_HOVER} ${TRANSITION} ${FOCUS_RING} ${COARSE_CLOSE}`;

    case "pill-icon":
      return `flex items-center justify-center p-1 text-fg-muted hover:text-fg ${QUIET_HOVER} ${TRANSITION} rounded-md ${FOCUS_RING} ${DISABLED} select-none ${COARSE_PILL_ICON}`;

    case "unstyled":
      return FOCUS_RING;

    default:
      return baseStyles;
  }
};

import { MONO_FONT_STACK } from "@/app/atoms/atoms";

export const FONT_SIZES = [
  { label: "Compact", value: "14px" },
  { label: "Standard", value: "16px" },
  { label: "Large", value: "18px" },
  { label: "XL", value: "22px" },
];

// Values never go below the editor's known-good defaults (1.8 / normal). Tighter
// line-height or negative letter-spacing makes the transparent textarea diverge from
// the highlighted <pre> overlay in react-simple-code-editor, drifting the caret off the
// text — so we only offer the default-or-looser direction, which stays aligned.
export const LINE_HEIGHTS = [
  { label: "Normal", value: "1.8" },
  { label: "Relaxed", value: "2.0" },
  { label: "Loose", value: "2.3" },
];

export const LETTER_SPACINGS = [
  { label: "Normal", value: "normal" },
  { label: "Wide", value: "0.04em" },
];

export const FONTS = [
  { label: "System Mono", value: MONO_FONT_STACK },
  { label: "JetBrains Mono", value: "var(--font-jetbrains), ui-monospace, monospace" },
  { label: "Fira Code", value: "var(--font-fira), ui-monospace, monospace" },
  { label: "IBM Plex Mono", value: "var(--font-ibm), ui-monospace, monospace" },
  { label: "Journal (Serif)", value: "Georgia, ui-serif, serif" },
];

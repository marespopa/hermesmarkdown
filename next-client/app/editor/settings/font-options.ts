import { MONO_FONT_STACK } from "@/app/atoms/atoms";

export const FONT_SIZES = [
  { label: "12px", value: "12px" },
  { label: "14px", value: "14px" },
  { label: "16px", value: "16px" },
  { label: "18px", value: "18px" },
  { label: "20px", value: "20px" },
  { label: "22px", value: "22px" },
  { label: "24px", value: "24px" },
];

// Line height is a single CSS var applied identically to the editor's caret,
// selection, and syntax layers (CM6 renders them in one content box), so any
// value in this range stays aligned.
export const LINE_HEIGHTS = [
  { label: "1.2", value: "1.2" },
  { label: "1.3", value: "1.3" },
  { label: "1.4", value: "1.4" },
  { label: "1.5", value: "1.5" },
  { label: "1.6", value: "1.6" },
  { label: "1.7", value: "1.7" },
  { label: "1.8", value: "1.8" },
  { label: "1.9", value: "1.9" },
  { label: "2.0", value: "2.0" },
];

export const FONTS = [
  { label: "Monospace", value: "ui-monospace, monospace" },
  { label: "Sans-serif", value: "ui-sans-serif, sans-serif" },
  { label: "Serif", value: "ui-serif, serif" },
  { label: "IBM Plex Mono", value: MONO_FONT_STACK },
  { label: "JetBrains Mono", value: "var(--font-jetbrains-mono), ui-monospace, monospace" },
  { label: "Arial", value: "Arial, Helvetica, ui-sans-serif, sans-serif" },
  { label: "Georgia", value: "Georgia, ui-serif, serif" },
  { label: "Courier New", value: "'Courier New', ui-monospace, monospace" },
];

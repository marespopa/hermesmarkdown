import { DUOSPACE_FONT_STACK, MONO_FONT_STACK, UI_FONT_STACK } from "@/app/atoms/ui-atoms";

// The writing font: the app's two typefaces, the default (Geist Mono) first,
// then Duospace, a writing-only face.
export const FONTS = [
  { label: "Geist Mono", value: MONO_FONT_STACK },
  { label: "Inter", value: UI_FONT_STACK },
  { label: "Duospace", value: DUOSPACE_FONT_STACK },
];

// Reading text size: Settings → Appearance and the Text Size commands.
// Follows Apple's Dynamic Type body sizes; 17px is the default.
export const TEXT_SIZES = [
  { label: "Small", value: "15px" },
  { label: "Medium", value: "17px" },
  { label: "Large", value: "19px" },
  { label: "Extra large", value: "21px" },
  { label: "Largest", value: "23px" },
];

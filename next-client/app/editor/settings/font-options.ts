import { EDITORIAL_FONT_STACK, MONO_FONT_STACK, SERIF_FONT_STACK, UI_FONT_STACK } from "@/app/atoms/ui-atoms";

export const FONTS = [
  { label: "Plus Jakarta Sans", value: EDITORIAL_FONT_STACK },
  { label: "Source Serif 4", value: SERIF_FONT_STACK },
  { label: "Inter", value: UI_FONT_STACK },
  { label: "Geist Mono", value: MONO_FONT_STACK },
];

// Reading text size, Settings → Appearance and the welcome tour's text size
// step. Follows Apple's Dynamic Type body sizes; 17px is the default.
export const TEXT_SIZES = [
  { label: "Small", value: "15px" },
  { label: "Medium", value: "17px" },
  { label: "Large", value: "19px" },
  { label: "Extra large", value: "21px" },
  { label: "Largest", value: "23px" },
];

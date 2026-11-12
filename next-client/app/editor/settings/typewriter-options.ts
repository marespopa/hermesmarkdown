import type { TypewriterLevel } from "@/app/atoms/ui-atoms";

// The Typewriter Sound setting's choices (Settings → Editor and the
// `Typewriter Sound: …` palette commands), quietest first.
export const TYPEWRITER_OPTIONS: { value: TypewriterLevel; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "quiet", label: "Quiet" },
  { value: "normal", label: "Normal" },
  { value: "loud", label: "Loud" },
];

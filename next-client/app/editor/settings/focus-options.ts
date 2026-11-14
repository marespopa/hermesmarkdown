import type { FocusMode } from "@/app/atoms/ui-atoms";

// The Focus Dimming setting's choices (Settings → Editor and the
// `Focus Dimming: …` palette commands), mildest first: what dims while
// Focus is on.
export const FOCUS_OPTIONS: { value: FocusMode; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "dim", label: "Other paragraphs" },
  { value: "sentence", label: "Other sentences" },
];

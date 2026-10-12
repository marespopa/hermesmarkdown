import type { FocusMode } from "@/app/atoms/ui-atoms";

// The Focus setting's choices (Settings → Editor and the `Focus: …`
// palette commands), mildest first.
export const FOCUS_OPTIONS: { value: FocusMode; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "hide", label: "Hide interface while typing" },
  { value: "dim", label: "Hide interface and dim other paragraphs" },
];

import type { FocusMode } from "@/app/atoms/ui-atoms";

// The Focus setting's choices (Settings → Editor and the `Focus: …`
// palette commands), mildest first.
export const FOCUS_OPTIONS: { value: FocusMode; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "dim", label: "Dim other paragraphs" },
  { value: "sentence", label: "Dim other sentences" },
];

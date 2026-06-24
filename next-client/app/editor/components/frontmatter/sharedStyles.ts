export const textareaClass =
  "w-full px-4 py-2.5 text-ui-subhead font-sans transition-all duration-150 ease-in-out border rounded-xl outline-none resize-none " +
  "bg-paper-softgray border-beige text-ink-light placeholder:text-stone " +
  "dark:bg-paper-dark-surface/50 dark:border-clay dark:text-ink-dark dark:placeholder:text-stone " +
  "focus:ring-2 focus:ring-sage/15 dark:focus:ring-sage/20";

export const fieldLabelClass =
  "text-ui-footnote font-medium text-ink-muted dark:text-stone px-0.5";

export const fieldHelperClass = "text-ui-caption text-fg-faint px-0.5";

/** Fade in on focus, no layout shift — the row is always reserved, just invisible at rest. */
export const fieldHelperFadeClass = (active: boolean) =>
  `${fieldHelperClass} transition-opacity duration-150 ${active ? "opacity-100" : "opacity-0"}`;

export const FIELD_HELP: Record<string, string> = {
  read_when: `Phrase that triggers agents to load this note — e.g. "before touching the payment flow"`,
  scope: "Defines what this note covers. Agents use this to decide relevance.",
  related: "Paths to notes this one connects with. Used by the vault health scorer.",
};

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

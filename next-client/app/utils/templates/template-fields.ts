import { TOKEN_DESCRIPTIONS } from "./template-lint";
import { TEMPLATE_TOKENS, expandTemplate, extractPromptLabels, type TemplateToken } from "./template-tokens";

// What a template author sees instead of `{{…}}` syntax: plain names for the
// pills in template notes and for the Add field menu. Built from
// TEMPLATE_TOKENS so it can't drift from the engine.

const PROMPT_PREFIX = "prompt:";

const TOKEN_LABELS: Record<TemplateToken, string> = {
  date: "Today's date",
  time: "Current time",
  weekday: "Weekday",
  year: "Year",
  month: "Month number",
  day: "Day of the month",
  monthName: "Month name",
  title: "Note title",
  slug: "Title as file name",
  clipboard: "Clipboard",
  cursor: "Start typing here",
};

// The plain name of what's inside `{{…}}`, or null for an unknown token.
export function fieldLabel(token: string): string | null {
  const trimmed = token.trim();
  if (trimmed.startsWith(PROMPT_PREFIX)) {
    const question = trimmed.slice(PROMPT_PREFIX.length).trim();
    return question ? `Ask: ${question}` : null;
  }
  return (TOKEN_LABELS as Record<string, string>)[trimmed] ?? null;
}

export interface TemplateFieldOption {
  /** Plain name, shown in the menu. */
  label: string;
  /** Token name, also matched against what's typed after `{{`. */
  token: string;
  /** The whole token, braces included; empty for `ask`. */
  insert: string;
  /** Short hint: a live example value, else the description. */
  detail: string;
  /** What the field does. */
  info: string;
  /** "Ask a question…": the label comes from a dialog. */
  ask?: true;
}

// Questions the doc already asks first (so reusing one is a pick away), then
// a new question, then every built-in token with today's value as its example.
export function templateFieldOptions(doc: string, now: Date): TemplateFieldOption[] {
  const ctx = { now, title: "", clipboard: "", prompts: {} };
  const reused = extractPromptLabels(doc).map((question) => ({
    label: `Ask: ${question}`,
    token: `${PROMPT_PREFIX}${question}`,
    insert: `{{${PROMPT_PREFIX}${question}}}`,
    detail: "same answer",
    info: `Uses the answer to "${question}" again.`,
  }));
  const tokens = TEMPLATE_TOKENS.map((token) => {
    const insert = `{{${token}}}`;
    const example = expandTemplate(insert, ctx).text;
    const hasExample = example !== "" && example !== insert;
    return {
      label: TOKEN_LABELS[token],
      token,
      insert,
      detail: hasExample ? example : TOKEN_DESCRIPTIONS[token],
      info: TOKEN_DESCRIPTIONS[token],
    };
  });
  return [
    ...reused,
    {
      label: "Ask a question…",
      token: PROMPT_PREFIX,
      insert: "",
      detail: "asked when used",
      info: "Asks for a value each time the template is used, e.g. Owner.",
      ask: true,
    },
    ...tokens,
  ];
}

// Options matching what's typed after `{{`: a token-name prefix or a word
// in the plain name.
export function matchFieldOptions(options: TemplateFieldOption[], query: string): TemplateFieldOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter((option) =>
    option.token.toLowerCase().startsWith(q) ||
    option.label.toLowerCase().split(/[^a-z0-9']+/).some((word) => word.startsWith(q)),
  );
}

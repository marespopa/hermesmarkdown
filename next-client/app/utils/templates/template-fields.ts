import { TOKEN_DESCRIPTIONS } from "./template-lint";
import { TEMPLATE_TOKENS, expandTemplate, extractPromptLabels } from "./template-tokens";

// The fields a template author can insert, for the `{{` menu in template
// notes. Built from TEMPLATE_TOKENS so it can't drift from the engine.

export interface TemplateFieldOption {
  /** Shown in the menu and matched against what's typed after `{{`. */
  label: string;
  /** The whole token, braces included. */
  insert: string;
  /** Caret offset in `insert` after inserting (the end when absent). */
  caret?: number;
  /** Short hint: a live example value, else the description. */
  detail: string;
  /** What the field does. */
  info: string;
}

const NEW_PROMPT = "{{prompt:}}";

// Prompt labels already in `doc` first (so reusing one is a pick away), then
// a new prompt, then every built-in token with today's value as its example.
export function templateFieldOptions(doc: string, now: Date): TemplateFieldOption[] {
  const ctx = { now, title: "", clipboard: "", prompts: {} };
  const reused = extractPromptLabels(doc).map((label) => ({
    label: `prompt:${label}`,
    insert: `{{prompt:${label}}}`,
    detail: "asks once, reused",
    info: `Gets the same answer as the other {{prompt:${label}}} fields.`,
  }));
  const tokens = TEMPLATE_TOKENS.map((token) => {
    const insert = `{{${token}}}`;
    const example = expandTemplate(insert, ctx).text;
    const hasExample = example !== "" && example !== insert;
    return { label: token, insert, detail: hasExample ? example : TOKEN_DESCRIPTIONS[token], info: TOKEN_DESCRIPTIONS[token] };
  });
  return [
    ...reused,
    {
      label: "prompt:…",
      insert: NEW_PROMPT,
      caret: NEW_PROMPT.length - 2,
      detail: "asks for a value",
      info: "Asks for a value when the template is used. Type a label, e.g. {{prompt:Owner}}.",
    },
    ...tokens,
  ];
}

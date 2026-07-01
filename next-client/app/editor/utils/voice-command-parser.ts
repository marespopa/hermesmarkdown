// Pure grammar engine for the voice input feature: turns one recognized
// speech segment into a markdown insertion, with no DOM/React dependency so
// it stays trivially unit-testable and reusable if macros/revision commands
// are added later.

export interface VoiceListState {
  indentLevel: number;
  inCodeBlock: boolean;
}

export const initialVoiceListState: VoiceListState = {
  indentLevel: 0,
  inCodeBlock: false,
};

export type VoiceInsertion =
  | { kind: "markdown"; text: string; cursorOffset?: number }
  | { kind: "plain-text"; text: string }
  | { kind: "open-link-dialog" }
  | { kind: "delete-last" }
  | { kind: "none" };

// Dictated punctuation/layout words that would otherwise be spoken literally
// ("period", "comma") get mapped to their symbol/whitespace equivalent so
// users can dictate full sentences without switching to the keyboard.
const PUNCTUATION_WORDS: Record<string, string> = {
  period: ".",
  comma: ",",
  "question mark": "?",
  "exclamation mark": "!",
  "exclamation point": "!",
  colon: ":",
  semicolon: ";",
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
};

function parseHeadingLevel(raw: string): number | null {
  const lower = raw.toLowerCase();
  if (NUMBER_WORDS[lower] !== undefined) return NUMBER_WORDS[lower];
  const n = parseInt(lower, 10);
  if (n >= 1 && n <= 6) return n;
  return null;
}

const CURSOR_SENTINEL = "\0";
const INDENT_UNIT = "  ";

// Restricted sub-grammar applied to captured tail content (e.g. what follows
// "bullet"/"task complete") — only inline phrase transforms, never
// structural commands, so "bullet wiki link to dashboard" produces
// `- [[dashboard]]` while nested list/heading commands stay unambiguous.
function applyInlinePhraseTransform(content: string): string {
  const trimmed = content.trim();

  let m = /^wiki\s*link(?:\s+to)?\s+(.+)$/i.exec(trimmed);
  if (m) return `[[${m[1].trim()}]]`;

  m = /^link(?:\s+to)?\s+(.+)$/i.exec(trimmed);
  if (m) return `[[${m[1].trim()}]]`;

  m = /^bold\s+(.+)$/i.exec(trimmed);
  if (m) return `**${m[1].trim()}**`;

  m = /^italic\s+(.+)$/i.exec(trimmed);
  if (m) return `*${m[1].trim()}*`;

  return trimmed;
}

function indent(state: VoiceListState): string {
  return INDENT_UNIT.repeat(state.indentLevel);
}

/**
 * Parses one finalized speech segment against the current list/code-block
 * state and returns what to insert plus the updated state. Command keywords
 * are matched only at the start of the (trimmed) utterance, checked in
 * priority order from most to least specific, so multi-word phrases like
 * "end code block" are tried before the shorter "code block".
 */
export function parseVoiceSegment(
  rawTranscript: string,
  state: VoiceListState,
): { insertion: VoiceInsertion; nextState: VoiceListState } {
  const trimmed = rawTranscript.trim();

  // While inside a dictated code block, nothing is grammar-parsed — every
  // segment is literal code content — until the user explicitly closes it.
  if (state.inCodeBlock) {
    if (/^end code block$/i.test(trimmed)) {
      return {
        insertion: { kind: "markdown", text: "\n```\n" },
        nextState: { ...state, inCodeBlock: false },
      };
    }
    return {
      insertion: { kind: "plain-text", text: rawTranscript },
      nextState: state,
    };
  }

  let m: RegExpExecArray | null;

  m = /^(?:scratch that|delete last|undo that)$/i.exec(trimmed);
  if (m) {
    return { insertion: { kind: "delete-last" }, nextState: state };
  }

  m = /^new paragraph$/i.exec(trimmed);
  if (m) {
    return { insertion: { kind: "markdown", text: "\n\n" }, nextState: state };
  }

  m = /^new line$/i.exec(trimmed);
  if (m) {
    return { insertion: { kind: "markdown", text: "\n" }, nextState: state };
  }

  m = /^(period|comma|question mark|exclamation mark|exclamation point|colon|semicolon)$/i.exec(trimmed);
  if (m) {
    return { insertion: { kind: "markdown", text: PUNCTUATION_WORDS[m[1].toLowerCase()] }, nextState: state };
  }

  m = /^(?:done with list|end list)$/i.exec(trimmed);
  if (m) {
    return { insertion: { kind: "none" }, nextState: { ...state, indentLevel: 0 } };
  }

  m = /^(?:outdent|unindent)$/i.exec(trimmed);
  if (m) {
    return {
      insertion: { kind: "none" },
      nextState: { ...state, indentLevel: Math.max(0, state.indentLevel - 1) },
    };
  }

  m = /^(?:go\s+)?(one|two|three|four|five|six|\d+)\s+levels?\s+deep$/i.exec(trimmed);
  if (m) {
    const level = parseHeadingLevel(m[1]) ?? parseInt(m[1], 10);
    return {
      insertion: { kind: "none" },
      nextState: { ...state, indentLevel: Math.max(0, level) },
    };
  }

  m = /^end code block$/i.exec(trimmed);
  if (m) {
    // Not currently in a code block — no-op, nothing to close.
    return { insertion: { kind: "none" }, nextState: state };
  }

  m = /^code\s*block\s*([a-zA-Z0-9+#]*)$/i.exec(trimmed);
  if (m) {
    const lang = m[1] || "";
    const fence = `\`\`\`${lang}\n${CURSOR_SENTINEL}\n\`\`\``;
    const sentinelIdx = fence.indexOf(CURSOR_SENTINEL);
    return {
      insertion: { kind: "markdown", text: fence.replace(CURSOR_SENTINEL, ""), cursorOffset: sentinelIdx },
      nextState: { ...state, inCodeBlock: true },
    };
  }

  m = /^h(?:eading)?\s*(one|two|three|four|five|six|[1-6])\s+(.+)$/i.exec(trimmed);
  if (m) {
    const level = parseHeadingLevel(m[1]);
    if (level) {
      return {
        insertion: { kind: "markdown", text: `${"#".repeat(level)} ${applyInlinePhraseTransform(m[2])}` },
        nextState: state,
      };
    }
  }

  m = /^indent\s+(?:bullet|list item)\s+(.+)$/i.exec(trimmed);
  if (m) {
    const nextState = { ...state, indentLevel: state.indentLevel + 1 };
    return {
      insertion: { kind: "markdown", text: `${indent(nextState)}- ${applyInlinePhraseTransform(m[1])}` },
      nextState,
    };
  }

  m = /^(?:bullet|list item)\s+(.+)$/i.exec(trimmed);
  if (m) {
    return {
      insertion: { kind: "markdown", text: `${indent(state)}- ${applyInlinePhraseTransform(m[1])}` },
      nextState: state,
    };
  }

  m = /^indent\s+numbered\s+item\s+(.+)$/i.exec(trimmed);
  if (m) {
    const nextState = { ...state, indentLevel: state.indentLevel + 1 };
    return {
      insertion: { kind: "markdown", text: `${indent(nextState)}1. ${applyInlinePhraseTransform(m[1])}` },
      nextState,
    };
  }

  m = /^numbered\s+item\s+(.+)$/i.exec(trimmed);
  if (m) {
    return {
      insertion: { kind: "markdown", text: `${indent(state)}1. ${applyInlinePhraseTransform(m[1])}` },
      nextState: state,
    };
  }

  m = /^quote\s+(.+)$/i.exec(trimmed);
  if (m) {
    return {
      insertion: { kind: "markdown", text: `${indent(state)}> ${applyInlinePhraseTransform(m[1])}` },
      nextState: state,
    };
  }

  m = /^inline\s*code\s+(.+)$/i.exec(trimmed);
  if (m) {
    return { insertion: { kind: "markdown", text: `\`${m[1].trim()}\`` }, nextState: state };
  }

  m = /^strikethrough\s+(.+)$/i.exec(trimmed);
  if (m) {
    return { insertion: { kind: "markdown", text: `~~${m[1].trim()}~~` }, nextState: state };
  }

  m = /^indent\s+task\s+(?:incomplete|todo|unchecked)\s+(.+)$/i.exec(trimmed);
  if (m) {
    const nextState = { ...state, indentLevel: state.indentLevel + 1 };
    return {
      insertion: { kind: "markdown", text: `${indent(nextState)}- [ ] ${applyInlinePhraseTransform(m[1])}` },
      nextState,
    };
  }

  m = /^indent\s+task\s+(?:complete|done|checked)\s+(.+)$/i.exec(trimmed);
  if (m) {
    const nextState = { ...state, indentLevel: state.indentLevel + 1 };
    return {
      insertion: { kind: "markdown", text: `${indent(nextState)}- [x] ${applyInlinePhraseTransform(m[1])}` },
      nextState,
    };
  }

  m = /^task\s+(?:incomplete|todo|unchecked)\s+(.+)$/i.exec(trimmed);
  if (m) {
    return {
      insertion: { kind: "markdown", text: `${indent(state)}- [ ] ${applyInlinePhraseTransform(m[1])}` },
      nextState: state,
    };
  }

  m = /^task\s+(?:complete|done|checked)\s+(.+)$/i.exec(trimmed);
  if (m) {
    return {
      insertion: { kind: "markdown", text: `${indent(state)}- [x] ${applyInlinePhraseTransform(m[1])}` },
      nextState: state,
    };
  }

  m = /^wiki\s*link(?:\s+to)?\s+(.+)$/i.exec(trimmed);
  if (m) {
    return { insertion: { kind: "markdown", text: `[[${m[1].trim()}]]` }, nextState: state };
  }

  m = /^(?:insert\s+)?link$/i.exec(trimmed);
  if (m) {
    return { insertion: { kind: "open-link-dialog" }, nextState: state };
  }

  m = /^bold\s+(.+)$/i.exec(trimmed);
  if (m) {
    return { insertion: { kind: "markdown", text: `**${m[1].trim()}**` }, nextState: state };
  }

  m = /^italic\s+(.+)$/i.exec(trimmed);
  if (m) {
    return { insertion: { kind: "markdown", text: `*${m[1].trim()}*` }, nextState: state };
  }

  m = /^(?:horizontal rule|divider)$/i.exec(trimmed);
  if (m) {
    return { insertion: { kind: "markdown", text: "\n---\n" }, nextState: state };
  }

  if (!trimmed) {
    return { insertion: { kind: "none" }, nextState: state };
  }

  return { insertion: { kind: "plain-text", text: rawTranscript }, nextState: state };
}

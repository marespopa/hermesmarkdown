// Pure grammar engine for the voice input feature: turns one recognized
// speech segment into a markdown insertion, with no DOM/React dependency so
// it stays trivially unit-testable and reusable if macros/revision commands
// are added later.

export interface VoiceListState {
  indentLevel: number;
  inCodeBlock: boolean;
  /** Whether the next word dictated should be capitalized — set after a
   * sentence-ending punctuation mark or a structural command (heading,
   * bullet, new line, ...), since each of those starts a fresh sentence. */
  capitalizeNext: boolean;
}

export const initialVoiceListState: VoiceListState = {
  indentLevel: 0,
  inCodeBlock: false,
  capitalizeNext: true,
};

export type VoiceInsertion =
  | { kind: "markdown"; text: string; cursorOffset?: number; replacePrevious?: boolean }
  | { kind: "plain-text"; text: string; replacePrevious?: boolean }
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

// Matches punctuation words anywhere inside a longer dictated phrase (plus
// their surrounding whitespace), not just as a whole standalone utterance —
// users commonly speak them inline ("...using AI period next thought...")
// rather than pausing to say "period" on its own.
const INLINE_PUNCTUATION_PATTERN = new RegExp(
  `\\s*\\b(${Object.keys(PUNCTUATION_WORDS).join("|")})\\b\\s*`,
  "gi",
);

const SENTENCE_END_SYMBOLS = new Set([".", "!", "?"]);

// Replaces inline punctuation words with their symbol, attached directly to
// the preceding word (no space before) with a single trailing space (unless
// it's the last thing said, in which case there's nothing to trim to). Also
// capitalizes the start of each sentence: the first word if `capitalizeFirst`
// is set, and the first word following any ".", "!", or "?" produced along
// the way — a comma/colon/semicolon doesn't end a sentence, so it doesn't
// trigger capitalization of what follows.
function substituteInlinePunctuation(
  text: string,
  capitalizeFirst: boolean,
): { text: string; capitalizeNext: boolean } {
  let result = "";
  let lastIndex = 0;
  let capitalizeNext = capitalizeFirst;
  const pattern = new RegExp(INLINE_PUNCTUATION_PATTERN.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    const before = text.slice(lastIndex, match.index);
    if (capitalizeNext && /[a-zA-Z]/.test(before)) {
      result += capitalizeFirstLetter(before);
      capitalizeNext = false;
    } else {
      result += before;
    }
    const symbol = PUNCTUATION_WORDS[match[1].toLowerCase()];
    result += `${symbol} `;
    if (SENTENCE_END_SYMBOLS.has(symbol)) capitalizeNext = true;
    lastIndex = pattern.lastIndex;
  }
  const rest = text.slice(lastIndex);
  if (capitalizeNext && /[a-zA-Z]/.test(rest)) {
    result += capitalizeFirstLetter(rest);
    capitalizeNext = false;
  } else {
    result += rest;
  }
  return { text: result.trimEnd(), capitalizeNext };
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
};

// Homophones the Web Speech API commonly substitutes for a number word right
// after "heading"/"levels deep" — scoped to this narrow position only, since
// e.g. "for"/"ate" are too common as ordinary words to alias globally.
const NUMBER_HOMOPHONES: Record<string, number> = {
  to: 2, too: 2,
};

function parseHeadingLevel(raw: string): number | null {
  const lower = raw.toLowerCase();
  if (NUMBER_WORDS[lower] !== undefined) return NUMBER_WORDS[lower];
  if (NUMBER_HOMOPHONES[lower] !== undefined) return NUMBER_HOMOPHONES[lower];
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
  if (m) return `[[${capitalizeFirstLetter(m[1].trim())}]]`;

  m = /^link(?:\s+to)?\s+(.+)$/i.exec(trimmed);
  if (m) return `[[${capitalizeFirstLetter(m[1].trim())}]]`;

  m = /^bold\s+(.+)$/i.exec(trimmed);
  if (m) return `**${capitalizeFirstLetter(m[1].trim())}**`;

  m = /^italic\s+(.+)$/i.exec(trimmed);
  if (m) return `*${capitalizeFirstLetter(m[1].trim())}*`;

  // Each structural command (bullet, task, quote, heading, ...) starts a
  // fresh grammatical unit, so its content always capitalizes its own start
  // regardless of the surrounding dictation's sentence-capitalization state.
  return substituteInlinePunctuation(trimmed, true).text;
}

function indent(state: VoiceListState): string {
  return INDENT_UNIT.repeat(state.indentLevel);
}

// Capitalizes the first letter found, skipping any leading markdown syntax
// (e.g. "**" from a nested bold transform) so dictated headings read like
// normal titles without requiring the speaker to say "capital".
function capitalizeFirstLetter(text: string): string {
  const idx = text.search(/[a-zA-Z]/);
  if (idx === -1) return text;
  return text.slice(0, idx) + text[idx].toUpperCase() + text.slice(idx + 1);
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
        nextState: { ...state, inCodeBlock: false, capitalizeNext: true },
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
    return { insertion: { kind: "markdown", text: "\n\n" }, nextState: { ...state, capitalizeNext: true } };
  }

  // "new row" is a natural way to say "press enter"; the Web Speech API
  // commonly mishears it as "neuro" as a single whole utterance, so that
  // mishearing is aliased here too rather than requiring the speaker to
  // re-say it more clearly.
  m = /^(?:new line|new row|neuro)$/i.exec(trimmed);
  if (m) {
    return { insertion: { kind: "markdown", text: "\n" }, nextState: { ...state, capitalizeNext: true } };
  }

  m = /^(period|comma|question mark|exclamation mark|exclamation point|colon|semicolon)$/i.exec(trimmed);
  if (m) {
    const symbol = PUNCTUATION_WORDS[m[1].toLowerCase()];
    return {
      insertion: { kind: "markdown", text: symbol },
      nextState: SENTENCE_END_SYMBOLS.has(symbol) ? { ...state, capitalizeNext: true } : state,
    };
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

  m = /^(?:go\s+)?(one|two|to|too|three|four|five|six|\d+)\s+levels?\s+deep$/i.exec(trimmed);
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

  m = /^h(?:eading)?\s*(one|two|to|too|three|four|five|six|[1-6])\s+(.+)$/i.exec(trimmed);
  if (m) {
    const level = parseHeadingLevel(m[1]);
    if (level) {
      const content = applyInlinePhraseTransform(m[2]);
      return {
        // Trailing newline so dictation continuing after a heading lands on
        // its own row instead of running on into the heading text.
        insertion: { kind: "markdown", text: `${"#".repeat(level)} ${content}\n` },
        nextState: { ...state, capitalizeNext: true },
      };
    }
  }

  m = /^indent\s+(?:bullet|list item)\s+(.+)$/i.exec(trimmed);
  if (m) {
    const nextState = { ...state, indentLevel: state.indentLevel + 1, capitalizeNext: true };
    return {
      insertion: { kind: "markdown", text: `${indent(nextState)}- ${applyInlinePhraseTransform(m[1])}` },
      nextState,
    };
  }

  m = /^(?:bullet|list item)\s+(.+)$/i.exec(trimmed);
  if (m) {
    return {
      insertion: { kind: "markdown", text: `${indent(state)}- ${applyInlinePhraseTransform(m[1])}` },
      nextState: { ...state, capitalizeNext: true },
    };
  }

  m = /^indent\s+numbered\s+item\s+(.+)$/i.exec(trimmed);
  if (m) {
    const nextState = { ...state, indentLevel: state.indentLevel + 1, capitalizeNext: true };
    return {
      insertion: { kind: "markdown", text: `${indent(nextState)}1. ${applyInlinePhraseTransform(m[1])}` },
      nextState,
    };
  }

  m = /^numbered\s+item\s+(.+)$/i.exec(trimmed);
  if (m) {
    return {
      insertion: { kind: "markdown", text: `${indent(state)}1. ${applyInlinePhraseTransform(m[1])}` },
      nextState: { ...state, capitalizeNext: true },
    };
  }

  m = /^quote\s+(.+)$/i.exec(trimmed);
  if (m) {
    return {
      insertion: { kind: "markdown", text: `${indent(state)}> ${applyInlinePhraseTransform(m[1])}` },
      nextState: { ...state, capitalizeNext: true },
    };
  }

  m = /^inline\s*code\s+(.+)$/i.exec(trimmed);
  if (m) {
    return { insertion: { kind: "markdown", text: `\`${m[1].trim()}\`` }, nextState: { ...state, capitalizeNext: true } };
  }

  m = /^strikethrough\s+(.+)$/i.exec(trimmed);
  if (m) {
    return {
      insertion: { kind: "markdown", text: `~~${capitalizeFirstLetter(m[1].trim())}~~` },
      nextState: { ...state, capitalizeNext: true },
    };
  }

  m = /^indent\s+task\s+(?:incomplete|todo|unchecked)\s+(.+)$/i.exec(trimmed);
  if (m) {
    const nextState = { ...state, indentLevel: state.indentLevel + 1, capitalizeNext: true };
    return {
      insertion: { kind: "markdown", text: `${indent(nextState)}- [ ] ${applyInlinePhraseTransform(m[1])}` },
      nextState,
    };
  }

  m = /^indent\s+task\s+(?:complete|done|checked)\s+(.+)$/i.exec(trimmed);
  if (m) {
    const nextState = { ...state, indentLevel: state.indentLevel + 1, capitalizeNext: true };
    return {
      insertion: { kind: "markdown", text: `${indent(nextState)}- [x] ${applyInlinePhraseTransform(m[1])}` },
      nextState,
    };
  }

  m = /^task\s+(?:incomplete|todo|unchecked)\s+(.+)$/i.exec(trimmed);
  if (m) {
    return {
      insertion: { kind: "markdown", text: `${indent(state)}- [ ] ${applyInlinePhraseTransform(m[1])}` },
      nextState: { ...state, capitalizeNext: true },
    };
  }

  m = /^task\s+(?:complete|done|checked)\s+(.+)$/i.exec(trimmed);
  if (m) {
    return {
      insertion: { kind: "markdown", text: `${indent(state)}- [x] ${applyInlinePhraseTransform(m[1])}` },
      nextState: { ...state, capitalizeNext: true },
    };
  }

  m = /^wiki\s*link(?:\s+to)?\s+(.+)$/i.exec(trimmed);
  if (m) {
    return {
      insertion: { kind: "markdown", text: `[[${capitalizeFirstLetter(m[1].trim())}]]` },
      nextState: { ...state, capitalizeNext: true },
    };
  }

  m = /^(?:insert\s+)?link$/i.exec(trimmed);
  if (m) {
    return { insertion: { kind: "open-link-dialog" }, nextState: state };
  }

  m = /^bold\s+(.+)$/i.exec(trimmed);
  if (m) {
    return {
      insertion: { kind: "markdown", text: `**${capitalizeFirstLetter(m[1].trim())}**` },
      nextState: { ...state, capitalizeNext: true },
    };
  }

  m = /^italic\s+(.+)$/i.exec(trimmed);
  if (m) {
    return {
      insertion: { kind: "markdown", text: `*${capitalizeFirstLetter(m[1].trim())}*` },
      nextState: { ...state, capitalizeNext: true },
    };
  }

  m = /^(?:horizontal rule|divider)$/i.exec(trimmed);
  if (m) {
    return { insertion: { kind: "markdown", text: "\n---\n" }, nextState: { ...state, capitalizeNext: true } };
  }

  if (!trimmed) {
    return { insertion: { kind: "none" }, nextState: state };
  }

  const { text, capitalizeNext } = substituteInlinePunctuation(rawTranscript, state.capitalizeNext);
  return { insertion: { kind: "plain-text", text }, nextState: { ...state, capitalizeNext } };
}

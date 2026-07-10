// Plain-transcription grammar for the voice input feature: turns one
// recognized speech segment into text, with no DOM/React dependency so it
// stays trivially unit-testable. Dictation is transcription only — it does
// not insert markdown syntax or otherwise format the note from speech,
// since that would be the app editing the file without a manual step. It
// still recognizes a small set of SESSION-CONTROL phrases ("scratch that",
// "insert this", "stop listening") because those operate on the review
// buffer before anything is committed, not on the document itself.

export interface VoiceListState {
  /** Whether the next word dictated should be capitalized — set after a
   * sentence-ending punctuation mark, since that starts a fresh sentence. */
  capitalizeNext: boolean;
}

export const initialVoiceListState: VoiceListState = {
  capitalizeNext: true,
};

export const VOICE_COMMAND_HELP: { phrase: string; result: string }[] = [
  { phrase: '"new paragraph" / "new line"', result: "Blank line / line break" },
  { phrase: '"scratch that"', result: "Undo the last phrase" },
  { phrase: '"scratch all text" / "clear all text"', result: "Clear the whole preview" },
  { phrase: '"insert this/it/text" / "commit this/it/text"', result: "Insert into the document" },
  { phrase: '"insert this and stop listening"', result: "Insert, then turn the mic off" },
  { phrase: '"stop listening" / "done listening"', result: "Discard preview, turn mic off" },
];

export type VoiceInsertion =
  | { kind: "markdown"; text: string; cursorOffset?: number; replacePrevious?: boolean }
  | { kind: "plain-text"; text: string; replacePrevious?: boolean }
  | { kind: "delete-last" }
  | { kind: "clear-all" }
  | { kind: "commit" }
  | { kind: "commit-and-stop" }
  | { kind: "stop-listening" }
  | { kind: "none" };

// Chrome's continuous recognition doesn't reliably include a boundary space
// between two separately finalized segments (most noticeable after a longer
// pause), so naively concatenating chunks can glue words together. This
// inserts a separating space unless one side already provides one, or the
// new chunk is punctuation that should hug the previous word (".", ",", …).
export function joinVoiceChunks(base: string, next: string): string {
  if (!base) return next;
  if (!next) return base;
  if (/\s$/.test(base) || /^[\s.,!?;:)]/.test(next)) return base + next;
  return `${base} ${next}`;
}

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

// Capitalizes the first letter found.
function capitalizeFirstLetter(text: string): string {
  const idx = text.search(/[a-zA-Z]/);
  if (idx === -1) return text;
  return text.slice(0, idx) + text[idx].toUpperCase() + text.slice(idx + 1);
}

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

/**
 * Parses one finalized speech segment into plain text, recognizing only
 * session-control phrases (scratch that, insert this, stop listening, ...)
 * as commands — everything else is transcribed as-is (with punctuation-word
 * substitution), never turned into markdown syntax.
 */
export function parseVoiceSegment(
  rawTranscript: string,
  state: VoiceListState,
): { insertion: VoiceInsertion; nextState: VoiceListState } {
  const trimmed = rawTranscript.trim();

  let m: RegExpExecArray | null;

  m = /^(?:scratch that|delete last|undo that)$/i.exec(trimmed);
  if (m) {
    return { insertion: { kind: "delete-last" }, nextState: state };
  }

  m = /^(?:scratch all text|clear all text|clear all|clear everything)$/i.exec(trimmed);
  if (m) {
    return { insertion: { kind: "clear-all" }, nextState: initialVoiceListState };
  }

  // Combined "commit, then turn the mic off" — the natural way to end a
  // dictation session in one breath. Checked before the plain commit below
  // so "insert this and stop listening" doesn't get shadowed.
  m = /^(?:insert|commit)\s+(?:this|it|text)(?:\s+and)?\s+stop\s+(?:listening|dictating)$/i.exec(trimmed);
  if (m) {
    return { insertion: { kind: "commit-and-stop" }, nextState: state };
  }

  // Hands-free way to commit the dictated preview into the real document.
  m = /^(?:insert|commit)\s+(?:this|it|text)$/i.exec(trimmed);
  if (m) {
    return { insertion: { kind: "commit" }, nextState: state };
  }

  // Hands-free way to turn the mic off — a spoken alternative to the
  // "Stop Listening" button. "don't listening" is included because the Web
  // Speech API commonly mishears "done listening" that way.
  m = /^(?:stop|done|don'?t|finish(?:ed)?)\s+(?:listening|dictating|dictation)$/i.exec(trimmed);
  if (m) {
    return { insertion: { kind: "stop-listening" }, nextState: state };
  }

  m = /^new paragraph$/i.exec(trimmed);
  if (m) {
    return { insertion: { kind: "plain-text", text: "\n\n" }, nextState: { capitalizeNext: true } };
  }

  // "new row" is a natural way to say "press enter"; the Web Speech API
  // commonly mishears it as "neuro" as a single whole utterance, so that
  // mishearing is aliased here too rather than requiring the speaker to
  // re-say it more clearly.
  m = /^(?:new line|new row|neuro)$/i.exec(trimmed);
  if (m) {
    return { insertion: { kind: "plain-text", text: "\n" }, nextState: { capitalizeNext: true } };
  }

  m = /^(period|comma|question mark|exclamation mark|exclamation point|colon|semicolon)$/i.exec(trimmed);
  if (m) {
    const symbol = PUNCTUATION_WORDS[m[1].toLowerCase()];
    return {
      insertion: { kind: "plain-text", text: symbol },
      nextState: { capitalizeNext: SENTENCE_END_SYMBOLS.has(symbol) },
    };
  }

  if (!trimmed) {
    return { insertion: { kind: "none" }, nextState: state };
  }

  const { text, capitalizeNext } = substituteInlinePunctuation(rawTranscript, state.capitalizeNext);
  return { insertion: { kind: "plain-text", text }, nextState: { capitalizeNext } };
}

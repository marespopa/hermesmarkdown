// Generalizes the same trick already used for frontmatter (sliced off of
// `value` before it ever reaches the textarea, in MarkdownEditor.tsx) to
// collapsed Obsidian callout bodies: text that's excluded from the textarea's
// value never needs cursor/column alignment with an overlay, because there's
// no shared caret over it. Frontmatter is one fixed leading block; callouts
// are multiple, scattered, and independently toggled, so this module tracks
// an ordered list of hidden ranges and keeps them in sync across edits.

const REGEX_OBSIDIAN_CALLOUT_RAW = /^(>\s*)+\[!(\w+)\]([+-]?)\s*(.*)$/i;
const REGEX_QUOTE_DEPTH_RAW = /^(>\s*)+/;

export interface HiddenRange {
  start: number;
  end: number;
}

export interface HiddenSegment {
  offset: number;
  text: string;
}

/**
 * Scans `value` (the real, full source) for collapsed Obsidian callouts and
 * returns the character ranges of their bodies (title lines stay visible).
 *
 * blockId is `${displayLineIndex}:${type}`, where displayLineIndex accounts
 * for lines already removed by earlier collapsed callouts in the same pass —
 * this must match the line index the highlighter sees when it later scans
 * the stripped `displayValue`, since both use the same blockId scheme to
 * resolve toggle state.
 */
export function computeCollapsedCalloutRanges(
  value: string,
  collapsedObsidianCallouts: Record<string, boolean> = {},
): HiddenRange[] {
  const lines = value.split("\n");
  const lineStarts: number[] = [];
  let offset = 0;
  for (const line of lines) {
    lineStarts.push(offset);
    offset += line.length + 1;
  }

  const ranges: HiddenRange[] = [];
  let calloutDepth = 0;
  let collapsed = false;
  let inCallout = false;
  let bodyStart = -1;
  let bodyLineCount = 0;
  let linesRemovedSoFar = 0;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];

    if (inCallout) {
      const depthMatch = line.match(REGEX_QUOTE_DEPTH_RAW);
      const lineDepth = depthMatch ? (depthMatch[0].match(/>/g) || []).length : 0;
      const stillInBody = lineDepth >= calloutDepth && line.trim() !== "";

      if (stillInBody) {
        if (collapsed) {
          if (bodyStart === -1) bodyStart = lineStarts[idx];
          bodyLineCount++;
        }
        continue;
      }

      if (collapsed && bodyStart !== -1) {
        ranges.push({ start: bodyStart, end: lineStarts[idx] });
        linesRemovedSoFar += bodyLineCount;
      }
      inCallout = false;
      collapsed = false;
      bodyStart = -1;
      bodyLineCount = 0;
    }

    const m = line.match(REGEX_OBSIDIAN_CALLOUT_RAW);
    if (m) {
      const depthMatch = line.match(REGEX_QUOTE_DEPTH_RAW)!;
      const depth = (depthMatch[0].match(/>/g) || []).length;
      const requestedType = m[2].toLowerCase();
      const displayIdx = idx - linesRemovedSoFar;
      const blockId = `${displayIdx}:${requestedType}`;

      inCallout = true;
      calloutDepth = depth;
      // Collapse state lives entirely in collapsedObsidianCallouts (toggled
      // via the chevron, like frontmatter's expand/collapse) — the literal
      // `+`/`-` marker in the source is purely cosmetic display, never read
      // for behavior. Otherwise editing that character mid-typing would
      // retroactively flip a callout's fold state and yank the document
      // (and the caret) out from under the user.
      collapsed = collapsedObsidianCallouts[blockId] ?? false;
      bodyStart = -1;
      bodyLineCount = 0;
    }
  }

  if (inCallout && collapsed && bodyStart !== -1) {
    ranges.push({ start: bodyStart, end: value.length });
  }

  return ranges;
}

/**
 * One-time seed for collapsedObsidianCallouts when a file is first opened:
 * callouts marked `-` start collapsed, same as Obsidian. After this, the
 * `+`/`-` marker is never read again — only this initial seed and the
 * chevron toggle affect collapse state, so editing the marker text later
 * can't retroactively flip a callout's fold state out from under the user.
 */
export function computeInitialCollapsedCallouts(value: string): Record<string, boolean> {
  const lines = value.split("\n");
  const seed: Record<string, boolean> = {};
  let calloutDepth = 0;
  let collapsed = false;
  let inCallout = false;
  let bodyLineCount = 0;
  let linesRemovedSoFar = 0;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];

    if (inCallout) {
      const depthMatch = line.match(REGEX_QUOTE_DEPTH_RAW);
      const lineDepth = depthMatch ? (depthMatch[0].match(/>/g) || []).length : 0;
      const stillInBody = lineDepth >= calloutDepth && line.trim() !== "";
      if (stillInBody) {
        if (collapsed) bodyLineCount++;
        continue;
      }
      if (collapsed) linesRemovedSoFar += bodyLineCount;
      inCallout = false;
      collapsed = false;
      bodyLineCount = 0;
    }

    const m = line.match(REGEX_OBSIDIAN_CALLOUT_RAW);
    if (m) {
      const depthMatch = line.match(REGEX_QUOTE_DEPTH_RAW)!;
      const depth = (depthMatch[0].match(/>/g) || []).length;
      const requestedType = m[2].toLowerCase();
      const fold = m[3];
      const displayIdx = idx - linesRemovedSoFar;

      inCallout = true;
      calloutDepth = depth;
      collapsed = fold === "-";
      bodyLineCount = 0;
      if (collapsed) seed[`${displayIdx}:${requestedType}`] = true;
    }
  }

  return seed;
}

export interface CalloutTitle {
  blockId: string;
  offset: number;
  collapsed: boolean;
}

/**
 * Lists every Obsidian callout's title-line offset, for positioning a real
 * chevron button over each one (the same idea as frontmatter's expand/
 * collapse chevron, just placed per-callout instead of once at the top).
 *
 * Call this with the already-stripped `displayValue` — its own line index
 * is the blockId's line index directly, no removed-lines adjustment needed.
 */
export function listCalloutTitles(
  displayValue: string,
  collapsedObsidianCallouts: Record<string, boolean> = {},
): CalloutTitle[] {
  const lines = displayValue.split("\n");
  const lineStarts: number[] = [];
  let offset = 0;
  for (const line of lines) {
    lineStarts.push(offset);
    offset += line.length + 1;
  }

  const titles: CalloutTitle[] = [];
  let inCallout = false;
  let calloutDepth = 0;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];

    if (inCallout) {
      const depthMatch = line.match(REGEX_QUOTE_DEPTH_RAW);
      const lineDepth = depthMatch ? (depthMatch[0].match(/>/g) || []).length : 0;
      const stillInBody = lineDepth >= calloutDepth && line.trim() !== "";
      if (stillInBody) continue;
      inCallout = false;
      calloutDepth = 0;
    }

    const m = line.match(REGEX_OBSIDIAN_CALLOUT_RAW);
    if (m) {
      const depthMatch = line.match(REGEX_QUOTE_DEPTH_RAW)!;
      const depth = (depthMatch[0].match(/>/g) || []).length;
      const requestedType = m[2].toLowerCase();
      const blockId = `${idx}:${requestedType}`;

      inCallout = true;
      calloutDepth = depth;
      titles.push({
        blockId,
        offset: lineStarts[idx],
        collapsed: collapsedObsidianCallouts[blockId] ?? false,
      });
    }
  }

  return titles;
}

/** Removes each hidden range's text from `value`, returning the stripped
 * display text plus the held-back segments needed to reconstruct it later. */
export function stripHiddenRanges(
  value: string,
  ranges: HiddenRange[],
): { displayValue: string; segments: HiddenSegment[] } {
  if (ranges.length === 0) return { displayValue: value, segments: [] };

  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  let displayValue = "";
  let cursor = 0;
  const segments: HiddenSegment[] = [];

  for (const r of sorted) {
    displayValue += value.slice(cursor, r.start);
    segments.push({ offset: displayValue.length, text: value.slice(r.start, r.end) });
    cursor = r.end;
  }
  displayValue += value.slice(cursor);

  return { displayValue, segments };
}

/** Re-inserts held-back segments into a (possibly edited) display value to
 * reconstruct the full source text. */
export function restoreHiddenRanges(displayValue: string, segments: HiddenSegment[]): string {
  if (segments.length === 0) return displayValue;

  let result = "";
  let cursor = 0;
  for (const seg of segments) {
    result += displayValue.slice(cursor, seg.offset);
    result += seg.text;
    cursor = seg.offset;
  }
  result += displayValue.slice(cursor);

  return result;
}

function commonPrefixLength(a: string, b: string): number {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[i] === b[i]) i++;
  return i;
}

function commonSuffixLength(a: string, b: string, maxLen: number): number {
  let i = 0;
  while (i < maxLen && a[a.length - 1 - i] === b[b.length - 1 - i]) i++;
  return i;
}

/**
 * Remaps held-back segment offsets across a single textarea edit (old
 * display value -> new display value), so they can still be spliced back in
 * at the right place. Segments fully before the edit are untouched; segments
 * fully after shift by the edit's length delta; a segment whose boundary
 * sits inside the edited span snaps to the edit's end (rare — only happens
 * if a selection spanning a fold boundary is replaced in one go).
 */
export function shiftSegmentsForEdit(
  segments: HiddenSegment[],
  oldDisplayValue: string,
  newDisplayValue: string,
): HiddenSegment[] {
  if (segments.length === 0) return segments;

  const prefixLen = commonPrefixLength(oldDisplayValue, newDisplayValue);
  const maxSuffix = Math.min(oldDisplayValue.length, newDisplayValue.length) - prefixLen;
  const suffixLen = maxSuffix > 0 ? commonSuffixLength(oldDisplayValue, newDisplayValue, maxSuffix) : 0;
  const oldEditEnd = oldDisplayValue.length - suffixLen;
  const newEditEnd = newDisplayValue.length - suffixLen;
  const delta = newEditEnd - oldEditEnd;

  return segments.map((seg) => {
    if (seg.offset <= prefixLen) return seg;
    if (seg.offset >= oldEditEnd) return { ...seg, offset: seg.offset + delta };
    return { ...seg, offset: newEditEnd };
  });
}

/** Maps a character offset in the full source value to its position in the
 * stripped display value, clamping positions inside a hidden range to the
 * range's start (the nearest visible boundary). */
export function valueOffsetToDisplayOffset(valueOffset: number, ranges: HiddenRange[]): number {
  if (ranges.length === 0) return valueOffset;

  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  let removed = 0;
  for (const r of sorted) {
    if (valueOffset <= r.start) return valueOffset - removed;
    if (valueOffset <= r.end) return r.start - removed;
    removed += r.end - r.start;
  }
  return valueOffset - removed;
}

/** Maps a character offset in the stripped display value back to its
 * position in the full source value. */
export function displayOffsetToValueOffset(displayOffset: number, segments: HiddenSegment[]): number {
  let added = 0;
  for (const seg of segments) {
    if (seg.offset > displayOffset) break;
    added += seg.text.length;
  }
  return displayOffset + added;
}

import { WORKFLOW_TAGS, TODO_TAGS, TAG_COLORS } from "./constants";
import { DateMatch } from "../types";
import { TableInfo } from "../utils/table-detection";
import {
  REGEX_DATE_ISO,
  REGEX_DATE_SLASHED,
  REGEX_DATE_DOTTED,
  REGEX_DATE_WIKI,
  REGEX_CODE_INLINE,
  REGEX_WIKILINK,
  REGEX_HASHTAG,
  REGEX_CURRENCY,
  REGEX_LINK,
  REGEX_BOLD,
  REGEX_ITALIC,
  REGEX_STRIKETHROUGH,
} from "./regex";

const FADED =
  'class="opacity-40 dark:opacity-50 transition-opacity duration-500 hover:opacity-100"';

const CALLOUT_STYLES: Record<
  string,
  { border: string; bg: string; text: string; icon: string }
> = {
  note: { border: "border-indigo-500", bg: "bg-indigo-500/5", text: "text-indigo-600 dark:text-indigo-400", icon: "📝" },
  abstract: { border: "border-cyan-500", bg: "bg-cyan-500/5", text: "text-cyan-600 dark:text-cyan-400", icon: "📋" },
  info: { border: "border-blue-400", bg: "bg-blue-400/5", text: "text-blue-500 dark:text-blue-400", icon: "ℹ️" },
  tip: { border: "border-emerald-400", bg: "bg-emerald-400/5", text: "text-emerald-600 dark:text-emerald-400", icon: "💡" },
  success: { border: "border-green-500", bg: "bg-green-500/5", text: "text-green-600 dark:text-green-400", icon: "✅" },
  question: { border: "border-yellow-500", bg: "bg-yellow-500/5", text: "text-yellow-600 dark:text-yellow-400", icon: "❓" },
  warning: { border: "border-amber-500", bg: "bg-amber-500/5", text: "text-amber-600 dark:text-amber-400", icon: "⚠️" },
  failure: { border: "border-orange-500", bg: "bg-orange-500/5", text: "text-orange-600 dark:text-orange-400", icon: "❌" },
  danger: { border: "border-red-500", bg: "bg-red-500/5", text: "text-red-600 dark:text-red-400", icon: "🔥" },
  bug: { border: "border-rose-500", bg: "bg-rose-500/5", text: "text-rose-600 dark:text-rose-400", icon: "🐛" },
  example: { border: "border-violet-500", bg: "bg-violet-500/5", text: "text-violet-600 dark:text-violet-400", icon: "📑" },
  quote: { border: "border-stone", bg: "bg-paper-softgray/60 dark:bg-paper-dark-surface/40", text: "text-ink-muted dark:text-stone", icon: "💬" },
};

// Obsidian callout type aliases — resolved to a canonical CALLOUT_STYLES key
// before lookup. See https://help.obsidian.md/Editing+and+formatting/Callouts
const CALLOUT_ALIASES: Record<string, string> = {
  summary: "abstract",
  tldr: "abstract",
  hint: "tip",
  important: "tip",
  check: "success",
  done: "success",
  help: "question",
  faq: "question",
  caution: "warning",
  attention: "warning",
  fail: "failure",
  missing: "failure",
  error: "danger",
  cite: "quote",
};

// Obsidian callout syntax: `> [!type]+/- Optional title`. Operates on the
// already-HTML-escaped line, so `>` has become `&gt;`.
const REGEX_OBSIDIAN_CALLOUT = /^(&gt;\s*)+\[!(\w+)\]([+-]?)\s*(.*)$/i;
const REGEX_OBSIDIAN_QUOTE_DEPTH = /^(&gt;\s*)+/;

function processInlineMarkdown(
  text: string,
  dateMatch: DateMatch | null = null,
  activeLink: { rawString: string } | null = null,
) {
  let html = text;

  const transitionClass = "transition-all duration-100 ease-in-out";

  const getUnderlineClass = (matchStr: string) => {
    if (
      (dateMatch && dateMatch.rawString === matchStr) ||
      (activeLink && activeLink.rawString === matchStr)
    ) {
      return " underline decoration-sage decoration-2 underline-offset-[3px] dark:decoration-sage";
    }
    return "";
  };

  if (html.match(/\d/)) {
    html = html.replace(REGEX_DATE_WIKI, (match) => {
      const underline = getUnderlineClass(match);
      const date = match.slice(2, -2);
      return `<span ${FADED}>[[</span><span class="${transitionClass}${underline}">${date}</span><span ${FADED}>]]</span>`;
    });
    html = html.replace(REGEX_DATE_ISO, (match) => {
      const underline = getUnderlineClass(match);
      return `<span class="${transitionClass}${underline}">${match}</span>`;
    });
    html = html.replace(
      REGEX_DATE_SLASHED,
      (match) => `<span class="${transitionClass}${getUnderlineClass(match)}">${match}</span>`,
    );
    html = html.replace(
      REGEX_DATE_DOTTED,
      (match) => `<span class="${transitionClass}${getUnderlineClass(match)}">${match}</span>`,
    );
  }

  if (html.includes("[[")) {
    html = html.replace(REGEX_WIKILINK, (match, content) => {
      if (match.match(/\[\[\d{4}-\d{2}-\d{2}\]\]/)) return match;
      const parts = content.split("|");
      const displayText = parts.length > 1 ? parts[1].trim() : parts[0].trim();
      const underline = getUnderlineClass(match);
      return `<span ${FADED}>[[</span><span class="text-sage dark:text-sage font-bold underline cursor-pointer${underline}">${displayText}</span><span ${FADED}>]]</span>`;
    });
  }

  if (html.includes("`")) {
    html = html.replace(
      REGEX_CODE_INLINE,
      `<span ${FADED}>$1</span><span class="bg-paper-softgray/80 dark:bg-paper-dark-surface/50 rounded-sm">$2</span><span ${FADED}>$3</span>`,
    );
  }

  if (html.includes("#")) {
    html = html.replace(REGEX_HASHTAG, (match, before, fullTag) => {
      const tagName = fullTag.slice(1).toLowerCase();
      const isColored = WORKFLOW_TAGS.includes(tagName) || TODO_TAGS.includes(tagName);
      const colorClass = isColored
        ? TAG_COLORS[tagName]
        : "text-zinc-700 dark:text-zinc-300";

      return `${before}<span class="${colorClass} font-bold cursor-pointer">${fullTag}</span>`;
    });
  }

  if (/[$€£¥₹]|C\$|A\$|lei/.test(html)) {
    html = html.replace(
      REGEX_CURRENCY,
      `<span class="text-emerald-600 dark:text-emerald-400">$&</span>`,
    );
  }

  if (html.includes("[")) {
    html = html.replace(
      REGEX_LINK,
      (match, p1, p2, p3, p4, p5) =>
        `<span ${FADED}>${p1}</span><span class="text-sage dark:text-sage underline${getUnderlineClass(match)}">${p2}</span><span ${FADED}>${p3}${p4}${p5}</span>`,
    );
  }

  if (html.includes("*") || html.includes("_")) {
    html = html.replace(
      REGEX_BOLD,
      `<span ${FADED}>$1</span><strong class="font-bold text-ink-light dark:text-ink-dark">$2</strong><span ${FADED}>$1</span>`,
    );
    html = html.replace(
      REGEX_ITALIC,
      `<span ${FADED}>$1</span><em class="italic text-ink-light dark:text-ink-dark">$2</em><span ${FADED}>$1</span>`,
    );
  }

  if (html.includes("~~")) {
    html = html.replace(
      REGEX_STRIKETHROUGH,
      `<span ${FADED}>$1</span><del class="line-through opacity-40">$2</del><span ${FADED}>$3</span>`,
    );
  }

  return html;
}

export function highlightMarkdown(
  code: string,
  dateMatch: DateMatch | null = null,
  activeLink: { rawString: string } | null = null,
  tableInfo: TableInfo | null = null,
) {
  const lines = code.split("\n");
  let isInsideCodeBlock = false;
  let obsidianCalloutType: string | null = null;
  let obsidianCalloutDepth = 0;
  // Tracks position within a run of consecutive pipe-table lines so header/
  // zebra styling applies to every table in the doc, not just the one under
  // the cursor. -1 = not currently inside a table; 0 = header row.
  let tableRowCounter = -1;

  return lines
    .map((line, index) => {
      const html = line
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      let content = "";
      let blockClasses = "";

      const isPipeLine =
        /^\s*\|/.test(html) &&
        !isInsideCodeBlock &&
        obsidianCalloutType === null &&
        !html.startsWith("```") &&
        !html.startsWith("~~~");
      tableRowCounter = isPipeLine ? (tableRowCounter < 0 ? 0 : tableRowCounter + 1) : -1;

      if (
        obsidianCalloutType === null &&
        REGEX_OBSIDIAN_CALLOUT.test(html)
      ) {
        // Preserve every source character (just faded/colored in place) so the
        // overlay's text columns never drift from the real textarea caret —
        // inserting or stripping glyphs (e.g. swapping `[!type]` for an emoji)
        // desyncs the transparent cursor from the rendered text behind it.
        const m = html.match(REGEX_OBSIDIAN_CALLOUT)!;
        const depthMatch = html.match(REGEX_OBSIDIAN_QUOTE_DEPTH)!;
        const prefixText = depthMatch[0];
        const depth = (prefixText.match(/&gt;/g) || []).length;
        const requestedType = m[2].toLowerCase();
        const fold = m[3] as "+" | "-" | "";
        const resolvedType = CALLOUT_ALIASES[requestedType] ?? requestedType;
        const style = CALLOUT_STYLES[resolvedType] ?? CALLOUT_STYLES.note;

        obsidianCalloutType = requestedType;
        obsidianCalloutDepth = depth;

        const remainder = html.slice(prefixText.length);
        const bracketEnd = remainder.indexOf("]");
        const bracketText = remainder.slice(0, bracketEnd + 1);
        const afterBracket = remainder.slice(bracketEnd + 1);
        const rest = fold ? afterBracket.slice(1) : afterBracket;

        // The `+`/`-` marker, if present, is shown as plain text — purely
        // cosmetic/Obsidian-compatible display. It no longer drives
        // collapse behavior (that's all in collapsedObsidianCallouts now,
        // toggled by the real chevron button MarkdownEditor renders over
        // this line), so there's nothing here to keep in sync.
        const foldSpan = fold ? `<span class="${style.text} font-bold">${fold}</span>` : "";
        const titleSpan = rest.trim()
          ? `<span class="${style.text} font-bold">${rest}</span>`
          : `<span class="${style.text} font-bold opacity-70">${requestedType.charAt(0).toUpperCase() + requestedType.slice(1)}</span>`;
        content = `<span ${FADED}>${prefixText}${bracketText}</span>${foldSpan}${titleSpan}`;
        blockClasses = `${style.bg} ${style.border} border-l-2 pl-2.5 -ml-3`;
      } else if (
        obsidianCalloutType !== null &&
        (html.match(REGEX_OBSIDIAN_QUOTE_DEPTH)?.[0].match(/&gt;/g) || []).length >= obsidianCalloutDepth
      ) {
        const resolvedType = CALLOUT_ALIASES[obsidianCalloutType] ?? obsidianCalloutType;
        const style = CALLOUT_STYLES[resolvedType] ?? CALLOUT_STYLES.note;

        // Collapsed callout bodies are stripped out of the textarea's value
        // entirely upstream (see callout-folding.ts), so this branch only
        // ever runs for expanded callouts — there's no body line left to
        // render when collapsed.
        const bodyDepthMatch = html.match(REGEX_OBSIDIAN_QUOTE_DEPTH);
        const bodyPrefix = bodyDepthMatch ? bodyDepthMatch[0] : "";
        const body = html.slice(bodyPrefix.length);
        content = `<span ${FADED}>${bodyPrefix}</span>${processInlineMarkdown(body, dateMatch, activeLink)}`;
        blockClasses = `${style.bg} ${style.border} border-l-2 pl-2.5 -ml-3`;
      } else if (obsidianCalloutType !== null) {
        obsidianCalloutType = null;
        obsidianCalloutDepth = 0;
        content = processInlineMarkdown(html, dateMatch, activeLink);
      } else if (html.startsWith("\u0060\u0060\u0060") || html.startsWith("~~~")) {
        isInsideCodeBlock = !isInsideCodeBlock;
        const fence = html.slice(0, 3);
        const lang = html.slice(3);
        content = `<span ${FADED}>${fence}${lang}</span>`;
      } else if (isInsideCodeBlock) {
        const inner = html === "" ? " " : html;
        content = `<span class="bg-paper-softgray/50 dark:bg-paper-dark-surface/40">${inner}</span>`;
      } else if (!html.trim()) {
        content = html;
      } else if (/^( {0,3}([-*_])(?:\s*\2){2,}\s*)$/.test(html)) {
        content = `<span ${FADED}>${html}</span>`;
      } else if (html.startsWith("#") && /^#{1,6}\s/.test(html)) {
        content = html.replace(
          /^(#{1,6}\s+)(.*)$/,
          (m, hashes, label) =>
            `<span ${FADED}>${hashes}</span><span class="font-bold text-ink-light dark:text-ink-dark">${processInlineMarkdown(label, dateMatch, activeLink)}</span>`,
        );
      } else if (html.startsWith("&gt;")) {
        content = html.replace(
          /^(&gt;\s?)(.*)$/,
          (m, quote, label) =>
            `<span ${FADED}>${quote}</span><span class="text-ink-muted dark:text-stone">${processInlineMarkdown(label, dateMatch, activeLink)}</span>`,
        );
      } else if (/^\s*[-*+]\s+/.test(html)) {
        content = html.replace(
          /^(\s*[-*+]\s+)(\[[ xX]\]\s+)?(.*)$/,
          (m, bull, check, label) => {
            const isChecked = check?.toLowerCase().includes("x");
            const checkHtml = check ? `<span ${FADED}>${check}</span>` : "";
            return `<span ${FADED}>${bull}</span>${checkHtml}<span class="${isChecked ? "line-through opacity-40" : "text-ink-light dark:text-ink-dark"}">${processInlineMarkdown(label, dateMatch, activeLink)}</span>`;
          },
        );
      } else if (isPipeLine) {
        const isSeparator = /^\s*\|[\s:|-]+\|/.test(html);
        const nextLine = lines[index + 1] ?? "";
        const isHeader = tableRowCounter === 0 && /^\s*\|[\s:|-]+\|/.test(nextLine);
        const inActiveTable =
          !!tableInfo && index >= tableInfo.tableStart && index <= tableInfo.tableEnd;
        const activeCol = inActiveTable ? tableInfo!.cursorCol : -1;
        const isActiveRow = inActiveTable && index === tableInfo!.lineIdx;

        if (isSeparator) {
          content = `<span ${FADED}>${html}</span>`;
        } else {
          const cells = html.split("|");
          content = cells
            .map((cell, i) => {
              const processedCell = processInlineMarkdown(cell, dateMatch, activeLink);
              const cellIndex = i - 1;
              const cellHtml = isHeader
                ? `<span class="font-bold text-ink-light dark:text-ink-dark">${processedCell}</span>`
                : processedCell;
              if (cellIndex !== activeCol) return cellHtml;
              // The active cell gets an Excel-style green box around it. Built with
              // `ring` (box-shadow), not `border` — a real border would add width and
              // desync this overlay's text columns from the transparent textarea's
              // caret, since the two must stay character-for-character aligned.
              const cellClasses = isActiveRow
                ? "ring-2 ring-inset ring-sage"
                : "bg-sage/10 dark:bg-sage/15 rounded-sm";
              return `<span class="${cellClasses}">${cellHtml}</span>`;
            })
            .join(`<span ${FADED}>|</span>`);
        }

        if (isHeader) {
          blockClasses += " bg-paper-softgray/60 dark:bg-paper-dark-surface/50";
        } else if (!isSeparator && tableRowCounter >= 2 && tableRowCounter % 2 === 1) {
          // Zebra-stripe alternating data rows (every table in the doc, not
          // just the one under the cursor).
          blockClasses += " bg-black/[0.03] dark:bg-white/[0.04]";
        }
      } else {
        content = processInlineMarkdown(html, dateMatch, activeLink);
      }

      return `<div class="${blockClasses} min-h-[1.8em]">${content || " "}</div>`;
    })
    .join("");
}

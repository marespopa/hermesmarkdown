import { WORKFLOW_TAGS, TODO_TAGS, TAG_COLORS } from "./constants";
import { DateMatch } from "../types";
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
      return " underline decoration-blue-500 decoration-2 underline-offset-[3px] dark:decoration-blue-400";
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
      return `<span ${FADED}>[[</span><span class="text-blue-600 dark:text-blue-400 font-bold underline cursor-pointer${underline}">${displayText}</span><span ${FADED}>]]</span>`;
    });
  }

  if (html.includes("`")) {
    html = html.replace(
      REGEX_CODE_INLINE,
      `<span ${FADED}>$1</span><span class="bg-zinc-100/80 dark:bg-zinc-800/50 rounded-sm">$2</span><span ${FADED}>$3</span>`,
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
        `<span ${FADED}>${p1}</span><span class="text-blue-600 dark:text-blue-400 underline${getUnderlineClass(match)}">${p2}</span><span ${FADED}>${p3}${p4}${p5}</span>`,
    );
  }

  if (html.includes("*") || html.includes("_")) {
    html = html.replace(
      REGEX_BOLD,
      `<span ${FADED}>$1</span><strong class="font-bold text-zinc-900 dark:text-zinc-50">$2</strong><span ${FADED}>$1</span>`,
    );
    html = html.replace(
      REGEX_ITALIC,
      `<span ${FADED}>$1</span><em class="italic text-zinc-800 dark:text-zinc-200">$2</em><span ${FADED}>$1</span>`,
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
  isZenModeActive: boolean = false,
  activeLineIndex: number = -1,
  dateMatch: DateMatch | null = null,
  activeLink: { rawString: string } | null = null,
) {
  const lines = code.split("\n");
  let isInsideCodeBlock = false;

  return lines
    .map((line, index) => {
      const html = line
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      let content = "";
      if (html.startsWith("\u0060\u0060\u0060") || html.startsWith("~~~")) {
        isInsideCodeBlock = !isInsideCodeBlock;
        const fence = html.slice(0, 3);
        const lang = html.slice(3);
        content = `<span ${FADED}>${fence}${lang}</span>`;
      } else if (isInsideCodeBlock) {
        const inner = html === "" ? " " : html;
        content = `<span class="bg-zinc-100/50 dark:bg-zinc-800/40">${inner}</span>`;
      } else if (!html.trim()) {
        content = html;
      } else if (/^( {0,3}([-*_])(?:\s*\2){2,}\s*)$/.test(html)) {
        content = `<span ${FADED}>${html}</span>`;
      } else if (html.startsWith("#") && /^#{1,6}\s/.test(html)) {
        content = html.replace(
          /^(#{1,6}\s+)(.*)$/,
          (m, hashes, label) =>
            `<span ${FADED}>${hashes}</span><span class="font-bold text-zinc-900 dark:text-zinc-50">${processInlineMarkdown(label, dateMatch, activeLink)}</span>`,
        );
      } else if (html.startsWith("&gt;")) {
        content = html.replace(
          /^(&gt;\s?)(.*)$/,
          (m, quote, label) =>
            `<span ${FADED}>${quote}</span><span class="text-zinc-500 dark:text-zinc-400">${processInlineMarkdown(label, dateMatch, activeLink)}</span>`,
        );
      } else if (/^\s*[-*+]\s+/.test(html)) {
        content = html.replace(
          /^(\s*[-*+]\s+)(\[[ xX]\]\s+)?(.*)$/,
          (m, bull, check, label) => {
            const isChecked = check?.toLowerCase().includes("x");
            const checkHtml = check ? `<span ${FADED}>${check}</span>` : "";
            return `<span ${FADED}>${bull}</span>${checkHtml}<span class="${isChecked ? "line-through opacity-40" : "text-zinc-900 dark:text-zinc-100"}">${processInlineMarkdown(label, dateMatch, activeLink)}</span>`;
          },
        );
      } else if (/^\s*\|/.test(html)) {
        const isSeparator = /^\s*\|[\s:|-]+\|/.test(html);
        if (isSeparator) {
          content = `<span ${FADED}>${html}</span>`;
        } else {
          const withFadedPipes = html.replace(/\|/g, `<span ${FADED}>|</span>`);
          content = processInlineMarkdown(withFadedPipes, dateMatch, activeLink);
        }
      } else {
        content = processInlineMarkdown(html, dateMatch, activeLink);
      }

      const isActive = isZenModeActive && index === activeLineIndex;
      return `<div class="transition-all duration-700 ease-in-out ${isActive ? "bg-zinc-400/5 dark:bg-zinc-400/10 -mx-6 px-6 rounded-lg scale-[1.005] opacity-100 shadow-[0_0_40px_-15px_rgba(0,0,0,0.05)]" : ""} min-h-[1.8em]">${content || " "}</div>`;
    })
    .join("");
}

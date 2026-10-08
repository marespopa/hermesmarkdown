import { HiOutlineInformationCircle, HiOutlineExclamation, HiOutlineExclamationCircle, HiOutlineLightBulb, HiOutlineCheckCircle, HiOutlineBookOpen, HiOutlineQuestionMarkCircle, HiOutlineCode, HiOutlineChatAlt2 } from "react-icons/hi";
import type { IconType } from "react-icons";

export interface CalloutMeta {
  bg: string;
  text: string;
  Icon: IconType;
}

// Superset of Obsidian's built-in callout types, used by the codemirror
// syntax highlighter (app/editor/codemirror/highlight.ts).
export const CALLOUT_META: Record<string, CalloutMeta> = {
  note: { bg: "bg-indigo-500/5", text: "text-indigo-600 dark:text-indigo-400", Icon: HiOutlineInformationCircle },
  abstract: { bg: "bg-cyan-500/5", text: "text-cyan-600 dark:text-cyan-400", Icon: HiOutlineBookOpen },
  info: { bg: "bg-blue-400/5", text: "text-blue-500 dark:text-blue-400", Icon: HiOutlineInformationCircle },
  tip: { bg: "bg-emerald-400/5", text: "text-emerald-600 dark:text-emerald-400", Icon: HiOutlineLightBulb },
  success: { bg: "bg-green-500/5", text: "text-green-600 dark:text-green-400", Icon: HiOutlineCheckCircle },
  question: { bg: "bg-yellow-500/5", text: "text-yellow-600 dark:text-yellow-400", Icon: HiOutlineQuestionMarkCircle },
  warning: { bg: "bg-amber-500/5", text: "text-amber-600 dark:text-amber-400", Icon: HiOutlineExclamation },
  failure: { bg: "bg-orange-500/5", text: "text-orange-600 dark:text-orange-400", Icon: HiOutlineExclamationCircle },
  danger: { bg: "bg-red-500/5", text: "text-red-600 dark:text-red-400", Icon: HiOutlineExclamationCircle },
  bug: { bg: "bg-rose-500/5", text: "text-rose-600 dark:text-rose-400", Icon: HiOutlineExclamationCircle },
  example: { bg: "bg-violet-500/5", text: "text-violet-600 dark:text-violet-400", Icon: HiOutlineCode },
  quote: { bg: "bg-paper-softgray/60 dark:bg-paper-dark-surface/40", text: "text-ink-muted dark:text-stone", Icon: HiOutlineChatAlt2 },
};

export const CALLOUT_ALIASES: Record<string, string> = {
  summary: "abstract", tldr: "abstract", hint: "tip", important: "tip",
  check: "success", done: "success", help: "question", faq: "question",
  caution: "warning", attention: "warning", fail: "failure", missing: "failure",
  error: "danger", cite: "quote",
};

export function resolveCalloutType(type: string): string {
  const lower = type.toLowerCase();
  const resolved = CALLOUT_ALIASES[lower] ?? lower;
  return CALLOUT_META[resolved] ? resolved : "note";
}

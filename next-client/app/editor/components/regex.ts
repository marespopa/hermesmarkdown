export const REGEX_DATE_ISO = /\d{4}-\d{2}-\d{2}/g;
export const REGEX_DATE_SLASHED = /\d{2}\/\d{2}\/\d{4}/g;
export const REGEX_DATE_DOTTED = /\d{2}\.\d{2}\.\d{4}/g;
export const REGEX_DATE_WIKI = /\[\[\d{4}-\d{2}-\d{2}\]\]/g;
export const REGEX_DATE_DUE = /@due\(\d{4}-\d{2}-\d{2}\)/g;
// A task's work dates, stamped on status changes (app/utils/task-line.ts).
export const REGEX_DATE_STARTED = /@started\(\d{4}-\d{2}-\d{2}\)/g;
export const REGEX_DATE_DONE = /@done\(\d{4}-\d{2}-\d{2}\)/g;

export const REGEX_CODE_INLINE = /(`)(.*?)(`)/g;
export const REGEX_WIKILINK = /\[\[([^\]]+)\]\]/g;
export const REGEX_HASHTAG = /(^|\s)(#(?=[^#\s/]*[a-zA-Z])(?:[\w-]+(?:\/[\w-]+)*))(?=\s|$)/gim;
export const REGEX_LINK = /(\[)([^\]]+)(\]\()([^)]+)(\))/g;
export const REGEX_BOLD = /(\*\*|__)(.*?)\1/g;
export const REGEX_ITALIC = /(\*|_)(.*?)\1/g;
export const REGEX_STRIKETHROUGH = /(~~)(.*?)(~~)/g;
// A URL link, with an optional "title"; the URL may hold backslash-escaped
// characters (pasted HTML arrives as `[text](https://x.y/a_\(b\) "Title")`)
// or balanced parentheses, as typed (`https://x.y/a_(b)`).
export const REGEX_MD_LINK = /\[[^\]]+\]\((https?:\/\/(?:\\.|\([^\s()]*\)|[^\s()\\])+)(?:\s+"[^"]*")?\)/g;
// A link to a file in the vault: a path with no scheme, relative to the note
// or vault-rooted (`[Editor](./app/editor/README.md)`, `[Plan](/plans/a.md#Goals)`).
// Images (`![…](…)`), `#heading`-only and `//host` links are left out.
export const REGEX_MD_FILE_LINK = /(?<!!)\[[^\]]+\]\(((?![a-z][a-z0-9+.-]*:|\/\/|#)(?:\\.|[^\s()\\])+)(?:\s+"[^"]*")?\)/gi;
export const REGEX_MD_IMAGE = /!\[[^\]]*\]\(([^)\s]+)\)/g;
export const REGEX_CHECKBOX = /^(\s*[-*]\s*\[)([ xX/!-])(\])/;
export const REGEX_URL_PASTE = /^(https?:\/\/[^\s]+)$/i;
export const REGEX_QUOTE_PREFIX = /^(>\s*)+/;
export const REGEX_CALC = /calc\(([^)]+)\)=$/;

// Formatting code with Prettier, loaded on first use (the standalone build
// and only the plugins a language needs), so it costs nothing until someone
// formats. Notes themselves are never formatted: rewriting Markdown would
// change what the writer typed.
import type { Plugin } from "prettier";

type PluginName = "babel" | "estree" | "typescript" | "postcss" | "html" | "yaml" | "graphql";

interface Formatter {
  parser: string;
  plugins: PluginName[];
}

const JS: Formatter = { parser: "babel", plugins: ["babel", "estree"] };
const TS: Formatter = { parser: "typescript", plugins: ["typescript", "estree"] };
const JSON_: Formatter = { parser: "json", plugins: ["babel", "estree"] };

// By file extension or code fence language (both lowercased).
const FORMATTERS: Record<string, Formatter> = {
  js: JS, mjs: JS, cjs: JS, jsx: JS, javascript: JS,
  ts: TS, mts: TS, cts: TS, tsx: TS, typescript: TS,
  json: JSON_, jsonc: JSON_, json5: { parser: "json5", plugins: ["babel", "estree"] },
  css: { parser: "css", plugins: ["postcss"] },
  scss: { parser: "scss", plugins: ["postcss"] },
  less: { parser: "less", plugins: ["postcss"] },
  html: { parser: "html", plugins: ["html", "babel", "estree", "postcss"] },
  htm: { parser: "html", plugins: ["html", "babel", "estree", "postcss"] },
  vue: { parser: "vue", plugins: ["html", "babel", "estree", "postcss", "typescript"] },
  yaml: { parser: "yaml", plugins: ["yaml"] },
  yml: { parser: "yaml", plugins: ["yaml"] },
  graphql: { parser: "graphql", plugins: ["graphql"] },
  gql: { parser: "graphql", plugins: ["graphql"] },
};

const PLUGIN_LOADERS: Record<PluginName, () => Promise<unknown>> = {
  babel: () => import("prettier/plugins/babel"),
  estree: () => import("prettier/plugins/estree"),
  typescript: () => import("prettier/plugins/typescript"),
  postcss: () => import("prettier/plugins/postcss"),
  html: () => import("prettier/plugins/html"),
  yaml: () => import("prettier/plugins/yaml"),
  graphql: () => import("prettier/plugins/graphql"),
};

// The language key of a file path ("src/App.tsx" → "tsx") or fence info
// string ("ts title=x" → "ts").
export function formatLanguageOf(pathOrInfo: string, isPath: boolean): string {
  if (!isPath) return pathOrInfo.trim().split(/[\s{]/)[0].toLowerCase();
  const name = pathOrInfo.slice(pathOrInfo.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

export function canFormat(language: string): boolean {
  return Object.hasOwn(FORMATTERS, language);
}

// The formatted text, or null when the language has no formatter. Throws
// Prettier's error (a syntax error, with its line) when the code can't parse.
// `options` are the project's (prettier-config.ts); parser and plugins are ours.
export async function formatCode(code: string, language: string, options: Record<string, unknown> = {}): Promise<string | null> {
  const formatter = FORMATTERS[language];
  if (!formatter) return null;
  const [prettier, ...plugins] = await Promise.all([
    import("prettier/standalone"),
    ...formatter.plugins.map((name) => PLUGIN_LOADERS[name]()),
  ]);
  return prettier.format(code, { ...options, parser: formatter.parser, plugins: plugins as Plugin[] });
}

// Which vault files are notes and which are other text files. Notes (`.md`)
// are indexed and edited as Markdown; text files (code, data, plain text)
// are listed in Files and open as plain text, but are never indexed, so they
// stay out of All Notes, tags, tasks, links and search.

const TEXT_FILE_EXTENSIONS = new Set([
  "txt", "text", "log",
  "json", "jsonc", "yaml", "yml", "toml", "ini", "cfg", "conf", "csv", "tsv", "xml",
  "js", "mjs", "cjs", "jsx", "ts", "tsx", "css", "scss", "less", "html", "htm", "svg",
  "py", "rb", "go", "rs", "java", "kt", "swift", "c", "h", "cpp", "hpp", "cs", "php", "lua",
  "sh", "bash", "zsh", "fish", "sql", "r", "pl", "ex", "exs", "dart", "vue", "svelte",
]);

const extensionOf = (path: string) => {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
};

export function isMarkdownPath(path: string): boolean {
  return extensionOf(path) === "md";
}

// A text file that isn't a note. The vault's own data folder (`.hermesmarkdown/`) is
// handled as before: listed with hidden files and indexed.
export function isPlainTextPath(path: string): boolean {
  return !path.startsWith(".hermesmarkdown/") && TEXT_FILE_EXTENSIONS.has(extensionOf(path));
}

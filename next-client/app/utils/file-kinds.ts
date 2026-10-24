// Which vault files are notes and which are other text files. Notes (`.md`)
// are indexed and edited as Markdown; text files (code, data, plain text)
// are listed in Files and open as plain text, but are never indexed, so they
// stay out of All Files, tags, tasks, links and search.

const TEXT_FILE_EXTENSIONS = new Set([
  "txt", "text", "log",
  "json", "jsonc", "yaml", "yml", "toml", "ini", "cfg", "conf", "csv", "tsv", "xml",
  "js", "mjs", "cjs", "jsx", "ts", "tsx", "css", "scss", "less", "html", "htm", "svg",
  "py", "rb", "go", "rs", "java", "kt", "swift", "c", "h", "cpp", "hpp", "cs", "php", "lua",
  "sh", "bash", "zsh", "fish", "sql", "r", "pl", "ex", "exs", "dart", "vue", "svelte",
  "mdx", "rst", "adoc", "properties", "gradle", "graphql", "gql", "proto", "tf", "hcl", "nix",
  "zig", "scala", "hs", "ml", "elm", "astro", "ps1", "bat", "diff", "patch",
]);

// Text files known by name rather than extension (extensionless names in
// general stay out: they're as often binaries). Compared lowercased.
const TEXT_FILE_NAMES = new Set([
  "dockerfile", "containerfile", "makefile", "gnumakefile", "rakefile", "gemfile", "procfile",
  "jenkinsfile", "vagrantfile", "brewfile", "license", "licence", "copying", "authors", "notice",
  "changelog", "readme", "codeowners",
  ".gitignore", ".gitattributes", ".gitmodules", ".editorconfig", ".dockerignore", ".npmrc",
  ".nvmrc", ".node-version", ".tool-versions", ".prettierrc", ".prettierignore", ".eslintrc",
  ".eslintignore", ".babelrc", ".browserslistrc", ".stylelintrc",
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
  if (path.startsWith(".hermesmarkdown/")) return false;
  const name = path.slice(path.lastIndexOf("/") + 1).toLowerCase();
  return TEXT_FILE_EXTENSIONS.has(extensionOf(path)) || TEXT_FILE_NAMES.has(name);
}

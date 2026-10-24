// The project's Prettier options for a file, read the way Prettier finds
// them: the nearest config from the file's folder up to the vault root
// (`package.json`'s "prettier" key, `.prettierrc` as JSON or simple YAML,
// `.prettierrc.json|yaml|yml`), then any `overrides` whose glob matches.
// JavaScript configs can't run in the browser, so finding one first means
// Prettier's defaults, said so in `note`. Only formatting options are taken
// (never `plugins` or `parser`).

export interface PrettierConfigResult {
  options: Record<string, unknown>;
  /** Where the options came from, or why defaults were used. */
  note?: string;
}

const FORMAT_OPTIONS = new Set([
  "printWidth", "tabWidth", "useTabs", "semi", "singleQuote", "quoteProps", "jsxSingleQuote",
  "trailingComma", "bracketSpacing", "bracketSameLine", "objectWrap", "arrowParens", "proseWrap",
  "htmlWhitespaceSensitivity", "vueIndentScriptAndStyle", "endOfLine", "singleAttributePerLine",
  "experimentalTernaries", "embeddedLanguageFormatting",
]);

const DATA_CONFIGS = ["package.json", ".prettierrc", ".prettierrc.json", ".prettierrc.yaml", ".prettierrc.yml"];
const SCRIPT_CONFIGS = [
  "prettier.config.js", "prettier.config.mjs", "prettier.config.cjs", "prettier.config.ts",
  ".prettierrc.js", ".prettierrc.mjs", ".prettierrc.cjs", ".prettierrc.ts", ".prettierrc.toml", ".prettierrc.json5",
];

function scalar(raw: string): unknown {
  const value = raw.trim().replace(/\s+#.*$/, "");
  if (value === "true" || value === "false") return value === "true";
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value.replace(/^(["'])(.*)\1$/, "$2");
}

// Top-level `key: value` lines; nested blocks (YAML overrides) are skipped.
function parseFlatYaml(text: string): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^([A-Za-z][\w-]*)\s*:\s*(\S.*)$/.exec(line);
    if (match) config[match[1]] = scalar(match[2]);
  }
  return config;
}

// A config file's settings, or null when it holds none ("package.json"
// without a "prettier" object).
export function parsePrettierConfig(fileName: string, text: string): Record<string, any> | null {
  if (fileName === "package.json") {
    const pkg = JSON.parse(text);
    return pkg && typeof pkg.prettier === "object" && pkg.prettier ? pkg.prettier : null;
  }
  if (fileName.endsWith(".yaml") || fileName.endsWith(".yml")) return parseFlatYaml(text);
  if (fileName.endsWith(".json")) return JSON.parse(text);
  // `.prettierrc` is JSON or YAML.
  try {
    return JSON.parse(text);
  } catch {
    return parseFlatYaml(text);
  }
}

// A Prettier `files` glob as a RegExp over a path relative to the config's
// folder: `*` within a segment, `**` across them, `{a,b}` alternatives. A
// glob without a slash matches the file name at any depth.
export function globToRegExp(glob: string): RegExp {
  let source = "";
  let braces = 0;
  for (let i = 0; i < glob.length; i++) {
    const char = glob[i];
    if (char === "*" && glob[i + 1] === "*") {
      source += glob[i + 2] === "/" ? "(?:.*/)?" : ".*";
      i += glob[i + 2] === "/" ? 2 : 1;
    } else if (char === "*") source += "[^/]*";
    else if (char === "?") source += "[^/]";
    else if (char === "{") {
      braces++;
      source += "(?:";
    } else if (char === "}" && braces) {
      braces--;
      source += ")";
    } else if (char === "," && braces) source += "|";
    else source += char.replace(/[.+^$()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${glob.includes("/") ? "" : "(?:.*/)?"}${source}$`);
}

const matchesAny = (globs: unknown, path: string) =>
  (Array.isArray(globs) ? globs : [globs]).some((glob) => typeof glob === "string" && globToRegExp(glob).test(path));

const pick = (options: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(options ?? {}).filter(([key]) => FORMAT_OPTIONS.has(key)));

// The options for `relativePath` (from the config's folder) under `config`.
export function optionsForFile(config: Record<string, any>, relativePath: string): Record<string, unknown> {
  let options = pick(config);
  for (const override of Array.isArray(config.overrides) ? config.overrides : []) {
    if (matchesAny(override?.files, relativePath) && !matchesAny(override?.excludeFiles, relativePath)) {
      options = { ...options, ...pick(override.options) };
    }
  }
  return options;
}

async function readFileIn(dir: FileSystemDirectoryHandle, name: string): Promise<string | null> {
  try {
    return await (await (await dir.getFileHandle(name)).getFile()).text();
  } catch {
    return null;
  }
}

async function exists(dir: FileSystemDirectoryHandle, name: string): Promise<boolean> {
  try {
    await dir.getFileHandle(name);
    return true;
  } catch {
    return false;
  }
}

// `filePath` is vault-relative; a draft (no folder) reads the vault root.
export async function resolvePrettierConfig(vault: FileSystemDirectoryHandle | null, filePath: string): Promise<PrettierConfigResult> {
  if (!vault) return { options: {} };
  const segments = filePath.split("/");
  const folders = segments.slice(0, -1);
  // The folders from the vault root down to the file's, as handles.
  const chain: FileSystemDirectoryHandle[] = [vault];
  for (const name of folders) {
    try {
      chain.push(await chain[chain.length - 1].getDirectoryHandle(name));
    } catch {
      break;
    }
  }
  for (let depth = chain.length - 1; depth >= 0; depth--) {
    const dir = chain[depth];
    const relativePath = segments.slice(depth).join("/");
    // One folder's candidates are looked up together, then taken in order.
    const [texts, scripts] = await Promise.all([
      Promise.all(DATA_CONFIGS.map((name) => readFileIn(dir, name))),
      Promise.all(SCRIPT_CONFIGS.map((name) => exists(dir, name))),
    ]);
    for (const [index, name] of DATA_CONFIGS.entries()) {
      const text = texts[index];
      if (text === null) continue;
      let config: Record<string, any> | null;
      try {
        config = parsePrettierConfig(name, text);
      } catch {
        return { options: {}, note: `Couldn't read ${name}; used Prettier's defaults` };
      }
      if (config) return { options: optionsForFile(config, relativePath) };
    }
    const script = SCRIPT_CONFIGS.find((_, index) => scripts[index]);
    if (script) return { options: {}, note: `${script} can't be read in the browser; used Prettier's defaults` };
  }
  return { options: {} };
}

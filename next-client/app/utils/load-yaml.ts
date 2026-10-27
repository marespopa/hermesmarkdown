// js-yaml's `load`, fetched the first time it's needed (it stays out of the
// first bundle): the frontmatter check (markdown-problems.ts) and the AI
// companion's frontmatter repair (companion/tools/edit-tools.ts).
export type YamlLoad = (source: string) => unknown;

let yamlLoad: Promise<YamlLoad> | null = null;
export function loadYaml(): Promise<YamlLoad> {
  yamlLoad ??= import("js-yaml").then((module) => module.load as YamlLoad);
  return yamlLoad;
}

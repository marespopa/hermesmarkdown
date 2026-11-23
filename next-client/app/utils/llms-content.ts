import { ALTERNATIVES, alternativePath } from "@/app/alternatives/content";
import { GUIDES, guideHeadline, guidePath } from "@/app/guides/content";
import { GROUPS } from "@/app/documentation/content";
import { SITE_URL, TOOLS, toolPath } from "@/app/tools/content/tools";

// The text of /llms.txt and /llms-full.txt, built from the same content as the
// pages (the tools catalog and the documentation), so it can't drift.

const SUMMARY =
  "HermesMarkdown is a minimal, local-first Markdown editor that runs in your browser and works offline. Notes are plain .md files in a folder you choose. There are no accounts and no cloud sync; only optional bring-your-own-key AI features talk to a server. It is unrelated to Hermes Agent's SOUL.md, memory.md or plan-mode files.";

const BROWSER_SUPPORT = [
  "| Browser | Where files are saved |",
  "| --- | --- |",
  "| Chrome, Edge | A folder on your disk, through the File System Access API |",
  "| Safari, Firefox, mobile | A browser vault, stored in the browser (IndexedDB) |",
].join("\n");

const docUrl = (id: string) => `${SITE_URL}/documentation/${id}`;

function header(): string[] {
  return ["# HermesMarkdown", "", `> ${SUMMARY}`, "", "## Browser support", "", BROWSER_SUPPORT, ""];
}

export function buildLlmsTxt(): string {
  const lines = [...header(), "## Free tools", ""];
  for (const tool of TOOLS) lines.push(`- [${tool.name}](${SITE_URL}${toolPath(tool)}): ${tool.lead}`);
  lines.push("", "## Alternatives", "");
  for (const entry of ALTERNATIVES) lines.push(`- [HermesMarkdown vs ${entry.competitor}](${SITE_URL}${alternativePath(entry)}): ${entry.lead}`);
  lines.push("", "## Guides", "");
  for (const entry of GUIDES) lines.push(`- [${guideHeadline(entry)}](${SITE_URL}${guidePath(entry)}): ${entry.lead}`);
  lines.push("", "## Documentation", "");
  for (const group of GROUPS) {
    lines.push(`### ${group.label}`, "");
    for (const item of group.items) lines.push(`- [${item.title}](${docUrl(item.id)}): ${item.lead}`);
    lines.push("");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

export function buildLlmsFullTxt(): string {
  const lines = [...header(), "## Free tools", ""];
  for (const tool of TOOLS) {
    lines.push(`### ${tool.name}`, "", `URL: ${SITE_URL}${toolPath(tool)}`, "", tool.description, "", tool.lead, "");
    lines.push("Features:", ...tool.features.map((feature) => `- ${feature}`), "");
    lines.push("FAQ:", "");
    for (const { q, a } of tool.faq) lines.push(`Q: ${q}`, `A: ${a}`, "");
  }
  lines.push("## Alternatives", "");
  for (const entry of ALTERNATIVES) {
    lines.push(`### HermesMarkdown vs ${entry.competitor}`, "", `URL: ${SITE_URL}${alternativePath(entry)}`, "", entry.description, "", entry.lead, "");
    lines.push("Comparison:", ...entry.comparison.map((row) => `- ${row.feature}: HermesMarkdown, ${row.hermes}. ${entry.competitor}, ${row.them}.`), "");
  }
  lines.push("## Guides", "");
  for (const entry of GUIDES) {
    lines.push(`### ${guideHeadline(entry)}`, "", `URL: ${SITE_URL}${guidePath(entry)}`, "", entry.description, "", entry.lead, "");
  }
  lines.push("## Documentation", "");
  for (const group of GROUPS) {
    lines.push(`### ${group.label}`, "");
    for (const item of group.items) {
      lines.push(`#### ${item.title}`, "", `URL: ${docUrl(item.id)}`, "", item.lead, "");
      if (item.keywords) lines.push(`Keywords: ${item.keywords}`, "");
    }
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

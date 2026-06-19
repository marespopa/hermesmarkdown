#!/usr/bin/env tsx
// `yarn hermes:index-preview [--query "..."] [--vault <path>] [--check --max-full <N>]`
//
// Reads .hermes/index.yaml and prints how each file resolves under the
// three-tier agent load protocol (skip / scope-only / full) for a given
// query — a read-only preview of what an agent would actually load.

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parseVaultIndex } from "../../app/services/vault-index-reader";
import { resolveTier, Tier } from "../../app/services/tier-resolver";

function parseArgs(argv: string[]) {
  const args = { query: "", vault: process.cwd(), check: false, maxFull: undefined as number | undefined };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--query") args.query = argv[++i] ?? "";
    else if (arg === "--vault") args.vault = argv[++i] ?? args.vault;
    else if (arg === "--check") args.check = true;
    else if (arg === "--max-full") args.maxFull = parseInt(argv[++i] ?? "", 10);
  }
  return args;
}

function printTable(rows: { file: string; tier: Tier; reason: string }[]) {
  const fileWidth = Math.max(4, ...rows.map((r) => r.file.length));
  const tierWidth = Math.max(4, ...rows.map((r) => r.tier.length));

  const header = `${"file".padEnd(fileWidth)}  ${"tier".padEnd(tierWidth)}  reason`;
  console.log(header);
  console.log("-".repeat(header.length));
  for (const row of rows) {
    console.log(`${row.file.padEnd(fileWidth)}  ${row.tier.padEnd(tierWidth)}  ${row.reason}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const indexPath = join(args.vault, ".hermes", "index.yaml");

  if (!existsSync(indexPath)) {
    console.error(`No index found at ${indexPath}. Open the vault in HermesMarkdown at least once to generate it.`);
    process.exit(1);
  }

  const yamlText = readFileSync(indexPath, "utf-8");
  const { entries, generated } = parseVaultIndex(yamlText);

  if (generated) {
    const ageMinutes = (Date.now() - new Date(generated).getTime()) / 60000;
    if (ageMinutes > 5) {
      console.error(`Warning: index generated ${Math.round(ageMinutes)} minutes ago — may be stale.\n`);
    }
  }

  const rows = entries.map((entry) => {
    const { tier, reason } = resolveTier(entry, args.query);
    return { file: entry.path, tier, reason };
  });

  printTable(rows);

  if (args.check && args.maxFull !== undefined) {
    const fullCount = rows.filter((r) => r.tier === "full").length;
    if (fullCount > args.maxFull) {
      console.error(`\n${fullCount} files resolved to "full" load, exceeding --max-full ${args.maxFull}`);
      process.exit(1);
    }
  }
}

main();

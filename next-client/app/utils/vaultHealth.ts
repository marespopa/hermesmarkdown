// Vault-wide Health Score: composite 0-100 rollup organized by the four
// context-engineering pillars (Write / Select / Compress / Isolate), so the
// vault-level score reinforces the same framing as the product's positioning
// rather than reading as generic PKM hygiene. See
// handoff-vault-health-scoring-dimensions.md for the dimension definitions.
import { FileMetadata } from "@/app/atoms/metadata";
import { VaultIndex } from "@/app/services/vault-index-reader";

export type Pillar = "Write" | "Select" | "Compress" | "Isolate";

export interface VaultHealthMetric {
  id: string;
  label: string;
  pass: number;
  total: number;
  reason: string;
}

export interface PillarResult {
  pillar: Pillar;
  score: number;
  metrics: VaultHealthMetric[];
}

export interface VaultHealthResult {
  composite: number;
  label: string;
  pillars: PillarResult[];
  fileCount: number;
}

// A "healthy" note stays well under a scoped read; "oversized" is the point
// where an agent forced to full-load pays a real tax. Both are generous
// defaults, not hard limits — tune once real vault data pushes back.
const COMPRESS_HEALTHY_TOKENS = 1500;
const COMPRESS_OVERSIZED_TOKENS = 3000;
const COMPRESS_MEANINGFUL_REDUCTION = 0.5;

function stripAnchor(link: string): string {
  return link.split("#")[0].trim();
}

function baseName(path: string): string {
  return path
    .replace(/^\.\//, "")
    .replace(/^.*\//, "")
    .replace(/\.md$/i, "")
    .trim();
}

function relatedListOf(f: FileMetadata): string[] {
  const raw = f.frontmatter?.related;
  if (!raw) return [];
  return String(raw)
    .split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

function scoreOf(metrics: VaultHealthMetric[]): number {
  const ratios = metrics.map((m) => (m.total > 0 ? m.pass / m.total : 1));
  return Math.round((ratios.reduce((sum, r) => sum + r, 0) / ratios.length) * 100);
}

export function computeVaultHealth(
  fileMetadata: Record<string, FileMetadata>,
  vaultIndex: VaultIndex | null,
): VaultHealthResult {
  const files = Object.values(fileMetadata).filter((f) => !f.path.startsWith(".hermes/"));
  const fileCount = files.length;

  if (fileCount === 0) {
    return { composite: 0, label: "Weak", pillars: [], fileCount: 0 };
  }

  const existingNames = new Set(files.map((f) => baseName(f.name)));
  const existingPaths = new Set(files.map((f) => f.path));

  const resolves = (link: string): boolean => {
    const target = stripAnchor(link);
    if (!target) return false;
    return existingNames.has(baseName(target)) || existingPaths.has(target);
  };

  // ── Write — structure exists ────────────────────────────────────────────

  const withFrontmatter = files.filter((f) => f.frontmatter && Object.keys(f.frontmatter).length > 0).length;
  const withReadWhen = files.filter((f) => !!f.frontmatter?.read_when).length;

  const inboundLinkCount = new Map<string, number>();
  const inboundRelatedCount = new Map<string, number>();
  for (const f of files) {
    for (const link of f.links) {
      const name = baseName(stripAnchor(link));
      inboundLinkCount.set(name, (inboundLinkCount.get(name) ?? 0) + 1);
    }
    for (const rel of relatedListOf(f)) {
      const name = baseName(stripAnchor(rel));
      inboundRelatedCount.set(name, (inboundRelatedCount.get(name) ?? 0) + 1);
    }
  }

  const notOrphaned = files.filter((f) => {
    const name = baseName(f.name);
    const outbound = f.links.length + relatedListOf(f).length;
    const inbound = (inboundLinkCount.get(name) ?? 0) + (inboundRelatedCount.get(name) ?? 0);
    return outbound + inbound > 0;
  }).length;

  const writeMetrics: VaultHealthMetric[] = [
    {
      id: "frontmatter", label: "Frontmatter present", pass: withFrontmatter, total: fileCount,
      reason: `${fileCount - withFrontmatter} note(s) missing frontmatter`,
    },
    {
      id: "read-when", label: "read_when defined", pass: withReadWhen, total: fileCount,
      reason: `${fileCount - withReadWhen} note(s) missing read_when`,
    },
    {
      id: "orphans", label: "Not orphaned", pass: notOrphaned, total: fileCount,
      reason: `${fileCount - notOrphaned} orphaned note(s) with no inbound or outbound links`,
    },
  ];

  // ── Select — agents can find the right thing ────────────────────────────

  const withScope = files.filter((f) => !!f.frontmatter?.scope).length;
  const filesWithBrokenLinks = files.filter((f) => f.links.some((l) => !resolves(l))).length;
  const notBroken = fileCount - filesWithBrokenLinks;

  const titleCounts = new Map<string, number>();
  for (const f of files) {
    const title = String(f.frontmatter?.title || f.name).trim().toLowerCase();
    titleCounts.set(title, (titleCounts.get(title) ?? 0) + 1);
  }
  const duplicateTitleFiles = files.filter((f) => {
    const title = String(f.frontmatter?.title || f.name).trim().toLowerCase();
    return (titleCounts.get(title) ?? 0) > 1;
  }).length;

  const selectMetrics: VaultHealthMetric[] = [
    {
      id: "scope", label: "Scope defined", pass: withScope, total: fileCount,
      reason: `${fileCount - withScope} note(s) missing scope`,
    },
    {
      id: "links", label: "Links resolve", pass: notBroken, total: fileCount,
      reason: `${filesWithBrokenLinks} note(s) with broken links`,
    },
    {
      id: "titles", label: "Unique titles", pass: fileCount - duplicateTitleFiles, total: fileCount,
      reason: `${duplicateTitleFiles} note(s) share a duplicate title`,
    },
  ];

  // ── Compress — context stays cheap ──────────────────────────────────────

  const withinHealthySize = files.filter((f) => (f.tokens?.full ?? 0) <= COMPRESS_HEALTHY_TOKENS).length;
  const notOversized = files.filter((f) => (f.tokens?.full ?? 0) <= COMPRESS_OVERSIZED_TOKENS).length;
  const meaningfullyScoped = files.filter((f) => {
    const full = f.tokens?.full ?? 0;
    const scoped = f.tokens?.scoped ?? 0;
    if (full === 0) return true;
    return 1 - scoped / full >= COMPRESS_MEANINGFUL_REDUCTION;
  }).length;

  const compressMetrics: VaultHealthMetric[] = [
    {
      id: "size", label: "Within healthy size", pass: withinHealthySize, total: fileCount,
      reason: `${fileCount - withinHealthySize} note(s) above ${COMPRESS_HEALTHY_TOKENS.toLocaleString()} tokens`,
    },
    {
      id: "oversized", label: "Not oversized", pass: notOversized, total: fileCount,
      reason: `${fileCount - notOversized} note(s) above ${COMPRESS_OVERSIZED_TOKENS.toLocaleString()} tokens`,
    },
    {
      id: "scoped-savings", label: "Scoped load meaningfully cheaper", pass: meaningfullyScoped, total: fileCount,
      reason: `${fileCount - meaningfullyScoped} note(s) where scoping saves less than ${Math.round(COMPRESS_MEANINGFUL_REDUCTION * 100)}%`,
    },
  ];

  // ── Isolate — index integrity ────────────────────────────────────────────

  let freshnessPass = 0;
  let freshnessTotal = fileCount;
  let freshnessReason = "No .hermes/index.yaml found — save or reopen the vault to generate one";
  if (vaultIndex) {
    const indexPaths = new Set(vaultIndex.entries.map((e) => e.path));
    const currentPaths = new Set(files.map((f) => f.path));
    const allPaths = new Set([...indexPaths, ...currentPaths]);
    const matching = [...allPaths].filter((p) => indexPaths.has(p) && currentPaths.has(p)).length;
    freshnessPass = matching;
    freshnessTotal = Math.max(allPaths.size, 1);
    const stale = freshnessTotal - matching;
    freshnessReason = stale === 0
      ? "Index matches current vault contents"
      : `${stale} note(s) out of sync with .hermes/index.yaml`;
  }

  const numericTags = files.reduce((sum, f) => sum + f.tags.filter((t) => /^\d+$/.test(t)).length, 0);
  const totalTags = files.reduce((sum, f) => sum + f.tags.length, 0);

  const withTokenEstimate = files.filter((f) => (f.tokens?.full ?? 0) > 0).length;

  const isolateMetrics: VaultHealthMetric[] = [
    {
      id: "index-freshness", label: "Index freshness", pass: freshnessPass, total: freshnessTotal,
      reason: freshnessReason,
    },
    {
      id: "tag-consistency", label: "Tag consistency", pass: totalTags === 0 ? 1 : totalTags - numericTags,
      total: totalTags === 0 ? 1 : totalTags,
      reason: numericTags > 0 ? `${numericTags} numeric-only tag(s) found` : "No numeric-only tags",
    },
    {
      id: "token-estimate", label: "Token cost estimable", pass: withTokenEstimate, total: fileCount,
      reason: `${fileCount - withTokenEstimate} note(s) without a token estimate`,
    },
  ];

  const pillars: PillarResult[] = [
    { pillar: "Write", score: scoreOf(writeMetrics), metrics: writeMetrics },
    { pillar: "Select", score: scoreOf(selectMetrics), metrics: selectMetrics },
    { pillar: "Compress", score: scoreOf(compressMetrics), metrics: compressMetrics },
    { pillar: "Isolate", score: scoreOf(isolateMetrics), metrics: isolateMetrics },
  ];

  const composite = Math.round(pillars.reduce((sum, p) => sum + p.score, 0) / pillars.length);
  const label = composite >= 75 ? "Structured" : composite >= 50 ? "Good" : composite >= 25 ? "Fair" : "Weak";

  return { composite, label, pillars, fileCount };
}

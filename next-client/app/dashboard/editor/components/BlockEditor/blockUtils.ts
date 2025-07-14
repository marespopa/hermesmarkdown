// Utility functions for BlockEditor

import { createHash } from "crypto";

export type BlockType = "text" | "heading" | "hr";
export interface Block {
  id: string;
  type: BlockType;
  content: string;
  headingLevel?: number; // 1 for #, 2 for ##, 3 for ###
}

let blockIdCounter = 0;
export function generateBlockId() {
  // Use crypto.randomUUID if available, else fallback to counter
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `block-${blockIdCounter++}`;
}

export function stableBlockId(content: string, index: number): string {
  // Simple hash: content + index
  let str = `${content}__${index}`;
  let hash = 0, i, chr;
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit int
  }
  return `block-${index}-${Math.abs(hash)}`;
}

export function parseMarkdownType(content: string): { type: BlockType, headingLevel?: number } {
  const headingMatch = /^(#{1,3})\s/.exec(content);
  if (headingMatch) {
    return { type: "heading", headingLevel: headingMatch[1].length };
  }
  if (/^---$/.test(content.trim())) return { type: "hr" };
  return { type: "text" };
}

export function blockToMarkdown(block: Block): string {
  if (block.type === "heading") {
    const level = block.headingLevel || 1;
    return `${"#".repeat(level)} ${block.content.replace(/^#{1,3}\s/, "")}`;
  }
  if (block.type === "hr") return `---`;
  return block.content;
} 
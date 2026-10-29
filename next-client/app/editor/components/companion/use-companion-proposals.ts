"use client";

import { useCallback } from "react";
import { useStore } from "jotai";
import { atom_companionProposals } from "@/app/atoms/companion-atoms";
import { useNoteBuffer } from "@/app/hooks/file-system/use-note-buffer";
import { applyEdits, replaceCodeBlock, type CodeBlockTarget, type FindReplace } from "./tools/edit-tools";
import { newProposal, proposalContent, type CompanionProposal, type ProposalHunkStatus, type ProposalImpact } from "./proposal";
import { useCompanionWrites, type WriteResult } from "./use-companion-writes";

export type ProposalDetails = { summary?: string; explanation?: string; impact?: ProposalImpact };
const isMissingFile = (error: unknown) => typeof error === "object" && error !== null && (error as { name?: string }).name === "NotFoundError";
const readFailure = (path: string, error: unknown): WriteResult => ({
  output: `Couldn't read ${path}: ${error instanceof Error ? error.message : String(error)}`,
  detail: "read failed",
});

export function useCompanionProposals() {
  const store = useStore();
  const { readCurrentText } = useNoteBuffer();
  const writes = useCompanionWrites();
  const readOrMissing = useCallback(async (path: string) => {
    try { return await readCurrentText(path); }
    catch (error) {
      if (isMissingFile(error)) return null;
      throw error;
    }
  }, [readCurrentText]);

  const add = useCallback((turnId: string, path: string, base: string, proposed: string, operation: CompanionProposal["operation"] = "write", templateName?: string, details?: ProposalDetails) => {
    if (base === proposed) return null;
    const proposal = newProposal(turnId, path, base, proposed, operation, templateName, details);
    store.set(atom_companionProposals, (all) => [...all, proposal]);
    return proposal;
  }, [store]);

  const editFile = useCallback(async (turnId: string, path: string, edits: FindReplace[], details?: ProposalDetails): Promise<WriteResult> => {
    const base = await readCurrentText(path);
    const result = applyEdits(base, edits);
    if (!result.ok) return { output: result.reason, detail: "not changed" };
    const proposal = add(turnId, path, base, result.text, "write", undefined, details);
    return proposal ? { output: `Proposed ${path} (${result.summary}). Review it before applying.`, detail: result.summary } : { output: `${path} already has exactly that text.`, detail: "not changed" };
  }, [readCurrentText, add]);

  const writeFile = useCallback(async (turnId: string, path: string, content: string, details?: ProposalDetails): Promise<WriteResult> => {
    let base: string | null;
    try { base = await readOrMissing(path); }
    catch (error) { return readFailure(path, error); }
    const proposed = content || "\n";
    const proposal = add(turnId, path, base ?? "", proposed, "write", undefined, details);
    return proposal ? { output: `Proposed a rewrite of ${path}. Review it before applying.`, detail: "proposed" } : { output: `${path} already has exactly that text.`, detail: "not changed" };
  }, [readOrMissing, add]);

  const createFile = useCallback(async (turnId: string, path: string, content: string, operation: "create" | "plan" = "create", details?: ProposalDetails): Promise<WriteResult> => {
    try {
      const existing = await readOrMissing(path);
      if (existing === null) {
        const proposal = add(turnId, path, "", content, operation, undefined, details);
        return proposal ? { output: `Proposed creating ${path}. Review it before applying.`, detail: "proposed" } : { output: `${path} wasn't changed.`, detail: "not changed" };
      }
      return { output: `${path} already exists. Review it and use edit_file instead.`, detail: "exists" };
    } catch (error) { return readFailure(path, error); }
  }, [readOrMissing, add]);

  const createTemplate = useCallback(async (turnId: string, path: string, name: string, body: string, details?: ProposalDetails): Promise<WriteResult> => {
    try {
      const existing = await readOrMissing(path);
      if (existing === null) {
        const proposal = add(turnId, path, "", body, "template", name, details);
        return proposal
          ? { output: `Proposed template ${path}. Review it before applying.`, detail: "proposed" }
          : { output: `${path} wasn't changed.`, detail: "not changed" };
      }
      return { output: `A template ${path} already exists. Read it and use edit_file to change it, or pick another name.`, detail: "exists" };
    } catch (error) { return readFailure(path, error); }
  }, [readOrMissing, add]);

  const editCodeBlock = useCallback(async (turnId: string, path: string, target: CodeBlockTarget, code: string, details?: ProposalDetails): Promise<WriteResult> => {
    const base = await readCurrentText(path);
    const result = replaceCodeBlock(base, target, code);
    if (!result.ok) return { output: result.reason, detail: "not changed" };
    const proposal = add(turnId, path, base, result.text, "write", undefined, details);
    return proposal ? { output: `Proposed ${path} (${result.summary}). Review it before applying.`, detail: result.summary } : { output: `${path} already has exactly that text.`, detail: "not changed" };
  }, [readCurrentText, add]);

  const setHunkStatus = useCallback((proposalId: string, hunkId: string, status: ProposalHunkStatus) => {
    store.set(atom_companionProposals, (all) => all.map((proposal) => proposal.id !== proposalId ? proposal : {
      ...proposal, hunks: proposal.hunks.map((hunk) => hunk.id === hunkId ? { ...hunk, status } : hunk),
    }));
  }, [store]);

  const setActiveHunk = useCallback((proposalId: string, index: number) => {
    store.set(atom_companionProposals, (all) => all.map((proposal) => proposal.id !== proposalId ? proposal : {
      ...proposal, activeHunkIndex: Math.max(0, Math.min(proposal.hunks.length - 1, index)),
    }));
  }, [store]);

  const toggleWalkthroughDetails = useCallback((proposalId: string) => {
    store.set(atom_companionProposals, (all) => all.map((proposal) => proposal.id === proposalId
      ? { ...proposal, showWalkthroughDetails: !proposal.showWalkthroughDetails } : proposal));
  }, [store]);

  const discard = useCallback((proposalId: string) => {
    store.set(atom_companionProposals, (all) => all.filter((proposal) => proposal.id !== proposalId));
  }, [store]);

  const apply = useCallback(async (proposal: CompanionProposal): Promise<WriteResult> => {
    let current: string | null;
    try { current = await readOrMissing(proposal.path); }
    catch (error) { return readFailure(proposal.path, error); }
    const currentContent = current ?? "";
    if (currentContent !== proposal.baseContent) return { output: `${proposal.path} changed since this proposal was made. Create a new proposal.`, detail: "stale" };
    const content = proposalContent(proposal);
    if (content === currentContent) return { output: "Accept at least one hunk before applying.", detail: "nothing accepted" };
    const result = proposal.operation === "create"
      ? await writes.createFile(proposal.turnId, proposal.path, content)
      : proposal.operation === "plan"
        ? await writes.createPlan(proposal.turnId, proposal.path, content)
        : proposal.operation === "template"
          ? await writes.createTemplate(proposal.turnId, proposal.templateName ?? proposal.path, content)
          : await writes.writeFile(proposal.turnId, proposal.path, content);
    if (!["failed", "not changed", "exists", "refused", "no vault"].includes(result.detail)) {
      store.set(atom_companionProposals, (all) => all.filter((item) => item.id !== proposal.id));
    }
    return result;
  }, [readOrMissing, writes, store]);

  return { editFile, writeFile, createFile, createTemplate, editCodeBlock, setHunkStatus, setActiveHunk, toggleWalkthroughDetails, discard, apply };
}

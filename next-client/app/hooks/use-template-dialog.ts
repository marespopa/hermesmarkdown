"use client";

import { useCallback } from "react";
import { useSetAtom } from "jotai";
import { atom_templateDialog, type TemplateWizardPreset, type TemplateWizardResult } from "@/app/atoms/template-atoms";
import type { TemplateEntry } from "@/app/utils/templates/template-registry";

export interface PickTemplateOptions {
  /** Show "Blank note" and "Board" rows (missing-link creation). */
  includeBlank?: boolean;
  title?: string;
  /** A template to put first and highlight, e.g. the one a link's name points to. */
  preselect?: TemplateEntry | null;
}

// Promise wrappers around atom_templateDialog (rendered by
// TemplateDialogHost), the same pattern as useDialog. null = cancelled.
export function useTemplateDialog() {
  const setRequest = useSetAtom(atom_templateDialog);

  const pickTemplate = useCallback(
    ({ includeBlank = false, title = "Insert template", preselect }: PickTemplateOptions = {}) =>
      new Promise<TemplateEntry | "blank" | "board" | null>((resolve) => {
        setRequest({
          kind: "pick",
          includeBlank,
          title,
          ...(preselect ? { preselect: preselect.path } : {}),
          resolve: (value) => {
            setRequest(null);
            resolve(value);
          },
        });
      }),
    [setRequest],
  );

  const askPrompts = useCallback(
    (labels: string[], confirmLabel: string) =>
      new Promise<Record<string, string> | null>((resolve) => {
        setRequest({
          kind: "prompts",
          labels,
          confirmLabel,
          resolve: (value) => {
            setRequest(null);
            resolve(value);
          },
        });
      }),
    [setRequest],
  );

  // The template wizard (New template…): kind, name and starting point,
  // opened on `preset` when given.
  const openWizard = useCallback(
    (preset?: TemplateWizardPreset) =>
      new Promise<TemplateWizardResult | null>((resolve) => {
        setRequest({
          kind: "wizard",
          preset,
          resolve: (value) => {
            setRequest(null);
            resolve(value);
          },
        });
      }),
    [setRequest],
  );

  return { pickTemplate, askPrompts, openWizard };
}

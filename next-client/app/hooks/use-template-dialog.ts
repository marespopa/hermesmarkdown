"use client";

import { useCallback } from "react";
import { useSetAtom } from "jotai";
import { atom_templateDialog } from "@/app/atoms/template-atoms";
import type { TemplateEntry } from "@/app/utils/templates/template-registry";

export interface PickTemplateOptions {
  /** Show "Blank note" as the first row (missing-link creation). */
  includeBlank?: boolean;
  title?: string;
}

// Promise wrappers around atom_templateDialog (rendered by
// TemplateDialogHost), the same pattern as useDialog. null = cancelled.
export function useTemplateDialog() {
  const setRequest = useSetAtom(atom_templateDialog);

  const pickTemplate = useCallback(
    ({ includeBlank = false, title = "Insert template" }: PickTemplateOptions = {}) =>
      new Promise<TemplateEntry | "blank" | null>((resolve) => {
        setRequest({
          kind: "pick",
          includeBlank,
          title,
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

  return { pickTemplate, askPrompts };
}

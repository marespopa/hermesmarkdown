"use client";

import { useSetAtom } from "jotai";
import { atom_globalDialog, DialogType, DialogSelectOption } from "@/app/atoms/atoms";
import { useCallback } from "react";

export function useDialog() {
  const setDialog = useSetAtom(atom_globalDialog);

  const showDialog = useCallback(
    (params: {
      type: DialogType;
      message: string;
      subtext?: string;
      title?: string;
      confirmLabel?: string;
      cancelLabel?: string;
      defaultValue?: string;
      multiline?: boolean;
      allowReferences?: boolean;
      options?: DialogSelectOption[];
    }) => {
      return new Promise<any>((resolve) => {
        setDialog({
          ...params,
          resolve: (value) => {
            setDialog(null);
            resolve(value);
          },
        });
      });
    },
    [setDialog],
  );

  const alert = useCallback(
    (message: string, title?: string) =>
      showDialog({ type: "alert", message, title }),
    [showDialog],
  );

  const confirm = useCallback(
    (message: string, title?: string, confirmLabel?: string, cancelLabel?: string, subtext?: string) =>
      showDialog({ type: "confirm", message, title, confirmLabel, cancelLabel, subtext }),
    [showDialog],
  );

  const prompt = useCallback(
    (message: string, defaultValue?: string, title?: string) =>
      showDialog({ type: "prompt", message, defaultValue, title }),
    [showDialog],
  );

  const textarea = useCallback(
    (message: string, defaultValue?: string, title?: string) =>
      showDialog({ type: "prompt", message, defaultValue, title, multiline: true, allowReferences: true }),
    [showDialog],
  );

  const select = useCallback(
    (message: string, options: DialogSelectOption[], title?: string) =>
      showDialog({ type: "select", message, options, title }),
    [showDialog],
  );

  const newFile = useCallback(
    () => showDialog({ type: "new-file", message: "Create a new file", title: "New File" }),
    [showDialog],
  );

  return { alert, confirm, prompt, textarea, select, newFile };
}

"use client";

import { useSetAtom } from "jotai";
import { atom_globalDialog, DialogType } from "@/app/atoms/atoms";
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

  return { alert, confirm, prompt };
}

"use client";

import React, { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { atom_globalDialog } from "@/app/atoms/atoms";
import DialogModal from "./DialogModal";
import Button from "@/app/components/Button";
import Input from "@/app/components/Input";

export default function GlobalDialog() {
  const [config] = useAtom(atom_globalDialog);
  const [promptValue, setPromptValue] = useState("");

  useEffect(() => {
    if (config?.type === "prompt") {
      setPromptValue(config.defaultValue || "");
    }
  }, [config]);

  if (!config) return null;

  const handleConfirm = () => {
    if (config.type === "prompt") {
      config.resolve(promptValue);
    } else if (config.type === "confirm") {
      config.resolve(true);
    } else {
      config.resolve(undefined);
    }
  };

  const handleCancel = () => {
    if (config.type === "confirm" || config.type === "prompt") {
      config.resolve(config.type === "confirm" ? false : null);
    } else {
      config.resolve(undefined);
    }
  };

  const isAlert = config.type === "alert";

  return (
    <DialogModal isOpened={!!config} onClose={handleCancel} styles="max-w-md">
      <div className="space-y-4">
        {config.title && (
          <h3 className="text-lg font-bold font-mono tracking-tight">
            {config.title}
          </h3>
        )}

        <p className="text-sm opacity-70 leading-relaxed">{config.message}</p>

        {config.subtext && (
          <p className="text-xs opacity-50 leading-relaxed">{config.subtext}</p>
        )}

        {config.type === "prompt" && (
          <div className="py-2">
            <Input
              name="prompt-input"
              value={promptValue}
              handleChange={(e) => setPromptValue(e.target.value)}
              placeholder="Enter value..."
              autoFocus
            />
          </div>
        )}

        <div className="flex flex-col gap-2 pt-4">
          <Button
            variant="primary"
            onClick={handleConfirm}
            className="w-full order-1"
          >
            {config.confirmLabel || (isAlert ? "Okay" : "Confirm")}
          </Button>
          {!isAlert && (
            <Button
              variant="secondary"
              onClick={handleCancel}
              className="w-full order-2"
            >
              {config.cancelLabel || "Cancel"}
            </Button>
          )}
        </div>
      </div>
    </DialogModal>
  );
}

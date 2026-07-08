"use client";

import React from "react";
import Button from "@/app/components/Button";

export default function VoiceMdNudgeToast({
  onSetUp,
  onDismiss,
}: {
  onSetUp: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="flex flex-col gap-2.5 max-w-sm p-4 rounded-xl border border-beige dark:border-clay bg-paper-light dark:bg-paper-dark shadow-lg">
      <p className="text-ui-footnote text-ink-light dark:text-ink-dark leading-relaxed">
        Set up a <span className="font-semibold">voice profile</span> (
        <code>.hermes/voice.md</code>) so AI matches your tone and audience when it writes or
        rewrites text.
      </p>
      <div className="flex items-center justify-end gap-2">
        <Button variant="outlined" onClick={onDismiss} className="h-8 px-3 text-ui-caption">
          Not now
        </Button>
        <Button variant="primary" onClick={onSetUp} className="h-8 px-3 text-ui-caption">
          Set up
        </Button>
      </div>
    </div>
  );
}

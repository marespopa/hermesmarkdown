"use client";

import { useEffect, useRef } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import toast from "react-hot-toast";
import { atom_isAiConfigured, atom_voiceWizardOpen, atom_voiceMdNudgeDismissed } from "@/app/atoms/ui-atoms";
import { useVoiceMdStatus } from "./use-voice-md-status";
import VoiceMdNudgeToast from "../components/VoiceMdNudgeToast";

/**
 * One-time nudge suggesting voice.md setup: shown at most once, ever, the
 * first time a vault is open with AI configured and no voice.md present.
 * Silently marks itself dismissed (no toast) if voice.md already exists, so
 * it never fires for vaults that already have one.
 */
export function useVoiceMdNudge() {
  const isAiConfigured = useAtomValue(atom_isAiConfigured);
  const exists = useVoiceMdStatus();
  const [dismissed, setDismissed] = useAtom(atom_voiceMdNudgeDismissed);
  const setVoiceWizardOpen = useSetAtom(atom_voiceWizardOpen);
  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (dismissed || !isAiConfigured || hasFiredRef.current || exists === null) return;
    hasFiredRef.current = true;

    if (exists) {
      setDismissed(true);
      return;
    }

    toast.custom(
      (t) => (
        <VoiceMdNudgeToast
          onSetUp={() => {
            setVoiceWizardOpen(true);
            setDismissed(true);
            toast.dismiss(t.id);
          }}
          onDismiss={() => {
            setDismissed(true);
            toast.dismiss(t.id);
          }}
        />
      ),
      { duration: 12000, position: "bottom-right" },
    );
  }, [dismissed, isAiConfigured, exists, setDismissed, setVoiceWizardOpen]);
}

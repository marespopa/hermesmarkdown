"use client";

import React from "react";
import { HiOutlineCheckCircle, HiOutlineMenu } from "react-icons/hi";
import useIsMobileChrome from "@/app/hooks/use-mobile-chrome";
import { formatShortcut } from "@/app/utils/platform";
import WizardStep from "./WizardStep";

// Final step: points at the command palette and closes the wizard.
export default function ReadyStep({ onFinish }: { onFinish: () => void }) {
  const isMobileChrome = useIsMobileChrome();
  return (
    <WizardStep
      icon={<HiOutlineCheckCircle size={32} />}
      title="You're ready to write."
      description="Your vault is set up. Search, tags, tasks and syntax helpers work as you go. Every choice you made here can be changed in Settings."
      continueLabel="Open Editor"
      onContinue={onFinish}
    >
      <p className="text-ui-caption opacity-50 flex flex-wrap items-center justify-center text-center gap-x-1.5 gap-y-1 leading-relaxed">
        {isMobileChrome ? (
          <>
            <span>Tap</span>
            <HiOutlineMenu className="inline shrink-0" size={14} />
            <span>anytime to open the command palette</span>
          </>
        ) : (
          <>
            <span>Press</span>
            <kbd className="text-ui-micro font-mono px-1.5 py-0.5 rounded bg-paper-softgray dark:bg-paper-dark-surface text-ink-muted dark:text-fg-faint border border-edge">
              {formatShortcut("k")}
            </kbd>
            <span>anytime to open the command palette</span>
          </>
        )}
      </p>
    </WizardStep>
  );
}

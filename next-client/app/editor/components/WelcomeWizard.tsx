"use client";

import React, { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { atom_hasCompletedOnboarding, atom_isWizardOpen } from "@/app/atoms/atoms";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import Button from "@/app/components/Button";
import {
  HiOutlineFolder,
  HiOutlineCode,
  HiOutlineTerminal,
  HiOutlineChartBar,
  HiOutlineCloud,
  HiOutlineSparkles,
} from "react-icons/hi";

const WelcomeWizard = () => {
  const [hasCompleted, setHasCompleted] = useAtom(atom_hasCompletedOnboarding);
  const [isWizardOpen, setIsWizardOpen] = useAtom(atom_isWizardOpen);
  const [step, setStep] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const showWizard = isMounted && (!hasCompleted || isWizardOpen);

  if (!showWizard) return null;

  const steps = [
    {
      title: "Connect Your Vault",
      subtitle: "Local or cloud — your choice",
      content: "Click Open Vault in the sidebar to select a local folder, or connect Google Drive to sync directly with your cloud storage. Hermes uses the File System Access API for local vaults — no servers, complete data sovereignty.",
      icon: <HiOutlineFolder className="text-amber-500" size={32} />,
    },
    {
      title: "Google Drive Sync",
      subtitle: "Your vault, everywhere",
      content: "Open Settings → Integrations and connect your Google account. Pick any Drive folder as your vault — Hermes indexes all your markdown files and saves changes back to Drive in real time. Switch between local and cloud vaults at any time.",
      icon: <HiOutlineCloud className="text-blue-500" size={32} />,
    },
    {
      title: "AI Writing Assistant",
      subtitle: "Claude & Gemini, built in",
      content: "Select any text in the editor to reveal the AI toolbar. Rewrite, expand, summarize, or ask a custom prompt — powered by your own Claude or Gemini API key. Add your key in Settings → AI Features and pick a model tier.",
      icon: <HiOutlineSparkles className="text-violet-500" size={32} />,
    },
    {
      title: "Frontmatter & Smart Filters",
      subtitle: "Machine-readable metadata",
      content: "Add a frontmatter block at the top of any file — id, title, status, tags: [ai, work]. Lifecycle tags (#draft, #review, #active, #archived) mirror the status field, and clicking a tag in the editor cycles it through the lifecycle. All tags are indexed into the Smart Filters panel.",
      icon: <HiOutlineCode className="text-amber-500" size={32} />,
    },
    {
      title: "Slash Commands & WikiLinks",
      subtitle: "Templates, links, and navigation",
      content: "Type / at the start of a line for the command menu — includes /agent, /role, /context, and /constraints blocks ready for any LLM. Type [[ to link notes and Ctrl/Cmd-click to jump between them. Drag tabs to split the workspace into side-by-side panes.",
      icon: <HiOutlineTerminal className="text-sky-500" size={32} />,
    },
    {
      title: "Agent Readability & Zen Mode",
      subtitle: "Write better, focus deeper",
      content: "The status bar shows a live AI readability score — Structured, Good, Fair, or Weak. Hover to see what's missing: frontmatter fields, heading continuity, typed code blocks. Press Ctrl+Shift+Z to enter Zen Mode and isolate your active line for distraction-free writing.",
      icon: <HiOutlineChartBar className="text-indigo-500" size={32} />,
    },
  ];

  const currentStep = steps[step];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      setHasCompleted(true);
      setIsWizardOpen(false);
      setStep(0);
    }
  };

  const handleSkip = () => {
    setHasCompleted(true);
    setIsWizardOpen(false);
    setStep(0);
  };

  return (
    <DialogModal 
      isOpened={showWizard} 
      onClose={handleSkip}
      styles="!max-w-sm"
    >
      <div className="flex flex-col items-center text-center space-y-6">
        <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-3xl">
          {currentStep.icon}
        </div>
        
        <div className="space-y-2">
          <h2 className="text-ui-title-3 font-bold tracking-tight">{currentStep.title}</h2>
          <p className="text-ui-footnote font-medium text-blue-600 dark:text-blue-400">
            {currentStep.subtitle}
          </p>
        </div>

        <p className="text-ui-subhead leading-relaxed opacity-70 px-2">
          {currentStep.content}
        </p>

        <div className="flex gap-2 w-full pt-4">
          {step > 0 && (
             <Button 
                variant="secondary" 
                onClick={() => setStep(step - 1)}
                className="flex-1 h-12 rounded-2xl text-ui-footnote font-medium"
             >
               Back
             </Button>
          )}
          <Button 
            variant="primary" 
            onClick={handleNext}
            className="flex-1 h-12 rounded-2xl text-ui-footnote font-medium"
          >
            {step === steps.length - 1 ? "Get Started" : "Next"}
          </Button>
        </div>

        <Button
          variant="bare"
          onClick={handleSkip}
          className="text-ui-footnote font-medium opacity-40 hover:opacity-100 transition-opacity"
        >
          Skip Introduction
        </Button>

        <div className="flex gap-1.5 pt-2">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`h-1 rounded-full transition-all ${i === step ? "w-4 bg-blue-500" : "w-1 bg-neutral-200 dark:bg-neutral-800"}`} 
            />
          ))}
        </div>
      </div>
    </DialogModal>
  );
};

export default WelcomeWizard;

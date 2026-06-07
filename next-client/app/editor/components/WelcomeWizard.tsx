"use client";

import React, { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { atom_hasCompletedOnboarding, atom_isWizardOpen } from "@/app/atoms/atoms";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import Button from "@/app/components/Button";
import {
  HiOutlineFolder,
  HiOutlineLink,
  HiOutlineCode,
  HiOutlineTerminal,
  HiOutlineLightningBolt,
  HiOutlineChartBar,
  HiOutlineEye,
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
      subtitle: "Your files, your device",
      content: "Click Open Vault in the sidebar and select any local folder. Hermes maps it directly into the browser workspace using the File System Access API — no cloud, no servers, complete data sovereignty.",
      icon: <HiOutlineFolder className="text-amber-500" size={32} />,
    },
    {
      title: "Frontmatter & Smart Filters",
      subtitle: "Machine-readable metadata",
      content: "Add a frontmatter block at the top of any file: id, title, status, version, and tags: [ai, work]. Lifecycle tags (#draft, #review, #active, #archived) mirror the status field — click any tag in the editor to cycle it through the document lifecycle. Hermes indexes all tags into the Smart Filters panel.",
      icon: <HiOutlineCode className="text-amber-500" size={32} />,
    },
    {
      title: "Slash Command Menu",
      subtitle: "Templates and insertions, instantly",
      content: "Type / at the start of a line to open the command menu. Fuzzy-filter by typing — each row shows an icon, description, and optional shortcut. Arrow keys navigate, Enter or Tab inserts. Includes /agent, /role, /context, and /constraints blocks ready for any LLM.",
      icon: <HiOutlineTerminal className="text-sky-500" size={32} />,
    },
    {
      title: "WikiLinks & Split Panes",
      subtitle: "Navigate and compare",
      content: "Type [[ to link to another note. Hold Ctrl/Cmd and click to navigate instantly. Drag any tab to split the workspace into side-by-side panes — ideal for keeping a reference doc open while you write.",
      icon: <HiOutlineLink className="text-blue-500" size={32} />,
    },
    {
      title: "Math & Shortcodes",
      subtitle: "Ambient intelligence in your drafts",
      content: "Lines beginning with + or - accumulate above a Total: marker — append a line from a terminal script and the total updates live. Type ..d for today's ISO date, or / → Financial Plan to scaffold a budget template.",
      icon: <HiOutlineLightningBolt className="text-emerald-500" size={32} />,
    },
    {
      title: "Agent Readability Score",
      subtitle: "Know your file's AI-readiness",
      content: "The status bar shows a live AI readability score for the active file — Structured, Good, Fair, or Weak. Hover to see exactly what the file is missing: frontmatter fields, heading continuity, typed code blocks, tables, and consistent list syntax. Fix the tips to make the file deterministically parseable by any agent.",
      icon: <HiOutlineChartBar className="text-indigo-500" size={32} />,
    },
    {
      title: "Zen Mode",
      subtitle: "Distraction-free deep work",
      content: "Press Ctrl+Shift+Z (or Cmd+Shift+Z). The file tree and sidebars recede. A focus tint isolates your active line, providing a clean, distraction-free writing environment.",
      icon: <HiOutlineEye className="text-rose-500" size={32} />,
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

        <button 
          onClick={handleSkip}
          className="text-ui-footnote font-medium opacity-40 hover:opacity-100 transition-opacity"
        >
          Skip Introduction
        </button>

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

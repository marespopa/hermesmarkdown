"use client";

import React, { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { atom_hasCompletedOnboarding, atom_isWizardOpen } from "@/app/atoms/atoms";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import Button from "@/app/components/Button";
import {
  HiOutlineFolder,
  HiOutlineLink,
  HiOutlineCollection,
  HiOutlineFilter,
  HiOutlineTag,
  HiOutlineLightningBolt,
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
      content: "Click Open Vault in the sidebar and select any local folder. Hermes maps it directly into the browser workspace using file system APIs — no cloud, no servers, complete data sovereignty.",
      icon: <HiOutlineFolder className="text-amber-500" size={32} />
    },
    {
      title: "WikiLinks",
      subtitle: "Bridge your ideas dynamically",
      content: "Type [[ to open a link suggestion dropdown. Select a note to link it. Hold Ctrl (or Cmd) and click the link to navigate instantly — without breaking your typing flow.",
      icon: <HiOutlineLink className="text-blue-500" size={32} />
    },
    {
      title: "Split Panes",
      subtitle: "Manage multiple documents at once",
      content: "Right-click a tab or drag it to the edge of the screen to split the editor into vertical or horizontal panes. Work with reference docs and drafts side-by-side in one viewport.",
      icon: <HiOutlineCollection className="text-teal-500" size={32} />
    },
    {
      title: "Smart Workspaces",
      subtitle: "Dynamic filters for your vault",
      content: "Click Smart Workspaces in the sidebar and select Today's Work. Dynamic smart folders filter your entire vault in real time — Today's Work surfaces files modified in the last 24 hours instantly.",
      icon: <HiOutlineFilter className="text-purple-500" size={32} />
    },
    {
      title: "Workflow Tags & Checkboxes",
      subtitle: "Interactive project management",
      content: "Click any checkbox to toggle it. Add #todo to a line and click the tag — it cycles inline through #todo → #prog → #wait → #done, turning your notes into a live kanban board.",
      icon: <HiOutlineTag className="text-indigo-500" size={32} />
    },
    {
      title: "Shortcodes & Inline Calc",
      subtitle: "Ambient intelligence in your drafts",
      content: "Type ..d to expand the current ISO date. Type / for template wrappers like Frontmatter. Type calc(100+50)= to compute inline — math stays in your document, not a separate tool.",
      icon: <HiOutlineLightningBolt className="text-emerald-500" size={32} />
    },
    {
      title: "Zen Mode",
      subtitle: "Distraction-free deep work",
      content: "Press Ctrl+Shift+Z (or Cmd+Shift+Z). The file tree and sidebars recede. Typewriter scrolling anchors your cursor at 40% screen height, and a focus tint isolates your active line.",
      icon: <HiOutlineEye className="text-rose-500" size={32} />
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

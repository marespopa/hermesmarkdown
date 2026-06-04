"use client";

import React, { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { atom_hasCompletedOnboarding, atom_isWizardOpen } from "@/app/atoms/atoms";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import Button from "@/app/components/Button";
import { 
  HiOutlineSparkles, 
  HiOutlineLightningBolt, 
  HiOutlineEye, 
  HiOutlineDatabase,
  HiOutlineCheckCircle
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
      title: "Welcome to HermesMarkdown",
      subtitle: "A professional writing environment",
      content: "HermesMarkdown is a local-first, privacy-focused editor designed for speed and clarity. Let's walk through the core features that make it unique.",
      icon: <HiOutlineSparkles className="text-amber-500" size={32} />
    },
    {
      title: "Local-First Privacy",
      subtitle: "Your data stays on your device",
      content: "Unlike traditional cloud editors, HermesMarkdown works directly with your local file system. Your notes are stored in 'Vaults'—local folders that never leave your device.",
      icon: <HiOutlineDatabase className="text-blue-500" size={32} />
    },
    {
      title: "Zen Mode",
      subtitle: "Distraction-free focus",
      content: "Press CTRL + SHIFT + Z to toggle Zen Mode. It hides all UI elements, enables typewriter scrolling, and highlights only your active line.",
      icon: <HiOutlineEye className="text-purple-500" size={32} />
    },
    {
      title: "Smart Shortcodes",
      subtitle: "Dynamic text expansion",
      content: "Type {date}, {time}, or {iso} to instantly stamp timestamps. You can also use '..d' for a quick date stamp. Try it in any document!",
      icon: <HiOutlineLightningBolt className="text-emerald-500" size={32} />
    },
    {
      title: "Ready to Write",
      subtitle: "Master your workflow",
      content: "Use Smart Tags (#todo, #prog) to track status, and interactive math (calc) to balance budgets. You're all set to explore!",
      icon: <HiOutlineCheckCircle className="text-indigo-500" size={32} />
    }
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

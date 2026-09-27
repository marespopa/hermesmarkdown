"use client";

import React from "react";
import Button from "@/app/components/Button";

interface WizardStepProps {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  children?: React.ReactNode;
  continueLabel?: string;
  onContinue: () => void;
}

// Shared layout of a welcome-wizard step: icon badge, title, description,
// the step's own control, and a full-width primary button.
export default function WizardStep({ icon, title, description, children, continueLabel = "Continue", onContinue }: WizardStepProps) {
  return (
    <div className="flex flex-col items-center text-center space-y-6 py-4">
      <div className="w-16 h-16 bg-sage/10 rounded-2xl flex items-center justify-center text-sage">
        {icon}
      </div>
      <div className="space-y-2">
        <h2 className="text-ui-title-3 font-bold">{title}</h2>
        <p className="text-ui-footnote opacity-60 px-4">{description}</p>
      </div>
      {children}
      <Button variant="primary" onClick={onContinue} className="w-full h-12 rounded-2xl text-ui-footnote font-bold">
        {continueLabel}
      </Button>
    </div>
  );
}

// The bordered panel most steps put their control in.
export function WizardPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`w-full rounded-2xl border border-edge p-4 bg-paper-softgray/40 dark:bg-paper-dark/30 ${className}`}>
      {children}
    </div>
  );
}

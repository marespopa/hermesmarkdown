"use client";

import React from "react";
import { useAtom } from "jotai";
import { HiOutlineHand } from "react-icons/hi";
import { atom_userName } from "@/app/atoms/ui-atoms";
import { BareInput } from "@/app/components/Input";
import WizardStep, { WizardPanel } from "./WizardStep";

// Step 0: the name the home feed greets you with ("Welcome, <name>!").
// Optional; Enter in the field continues.
export default function NameStep({ onContinue }: { onContinue: () => void }) {
  const [userName, setUserName] = useAtom(atom_userName);

  const handleContinue = () => {
    setUserName(userName.trim());
    onContinue();
  };

  return (
    <WizardStep
      icon={<HiOutlineHand size={32} />}
      title="Welcome to HermesMarkdown"
      description="What should we call you?"
      onContinue={handleContinue}
    >
      <WizardPanel>
        <BareInput
          value={userName}
          onChange={(event) => setUserName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.nativeEvent.isComposing) {
              event.preventDefault();
              handleContinue();
            }
          }}
          placeholder="Your name"
          aria-label="Your name"
          maxLength={60}
          autoFocus
          className="w-full bg-transparent text-center text-ui-body text-fg outline-none placeholder:text-fg-faint"
        />
      </WizardPanel>
    </WizardStep>
  );
}

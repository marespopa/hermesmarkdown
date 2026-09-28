"use client";

import { useState, useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import { atom_hasCompletedOnboarding, atom_isWizardOpen, atom_welcomeWizardStep } from "@/app/atoms/atoms";
import {
  atom_vaultHandle
} from "@/app/atoms/vault-atoms";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import Button from "@/app/components/Button";
import { HiOutlineArrowLeft } from "react-icons/hi";
import { useCreateVault } from "@/app/hooks/file-system/use-create-vault";
import AiKeyStep from "./welcome-wizard/AiKeyStep";
import { AutosaveStep, FlowModeStep, FontStep, LineNumbersStep, TextSizeStep, ThemeStep, VimStep } from "./welcome-wizard/PreferenceSteps";
import ReadyStep from "./welcome-wizard/ReadyStep";
import VaultStep from "./welcome-wizard/VaultStep";

const TOTAL_STEPS = 9;

const WelcomeWizard = ({ initialStep = 0 }: { initialStep?: number }) => {
  const [hasCompleted, setHasCompleted] = useAtom(atom_hasCompletedOnboarding);
  const [isWizardOpen, setIsWizardOpen] = useAtom(atom_isWizardOpen);
  const [step, setStep] = useAtom(atom_welcomeWizardStep);
  const [isMounted, setIsMounted] = useState(false);

  const createVaultFlow = useCreateVault();

  const vaultHandle = useAtomValue(atom_vaultHandle);

  useEffect(() => {
    setIsMounted(true);
    if (initialStep !== 0) setStep(initialStep);
  }, [initialStep, setStep]);

  useEffect(() => {
    if (step === 0 && vaultHandle) {
      setStep(1);
    }
  }, [step, vaultHandle, setStep]);

  const showWizard = isMounted && (!hasCompleted || isWizardOpen);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.isComposing) return;
      const target = event.target;
      if (
        target instanceof HTMLButtonElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (step >= 1 && step < TOTAL_STEPS) {
        event.preventDefault();
        setStep(step + 1);
      } else if (step === TOTAL_STEPS) {
        event.preventDefault();
        setHasCompleted(true);
        setIsWizardOpen(false);
        setStep(0);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setHasCompleted, setIsWizardOpen, setStep, step]);

  if (!showWizard) return null;

  const handleFinish = () => {
    setHasCompleted(true);
    setIsWizardOpen(false);
    setStep(0);
  };

  const next = (to: number) => () => setStep(to);
  const renderStep = () => {
    switch (step) {
      case 0: return <VaultStep createVaultFlow={createVaultFlow} />;
      case 1: return <ThemeStep onContinue={next(2)} />;
      case 2: return <FontStep onContinue={next(3)} />;
      case 3: return <TextSizeStep onContinue={next(4)} />;
      case 4: return <LineNumbersStep onContinue={next(5)} />;
      case 5: return <VimStep onContinue={next(6)} />;
      case 6: return <FlowModeStep onContinue={next(7)} />;
      case 7: return <AutosaveStep onContinue={next(8)} />;
      case 8: return <AiKeyStep onContinue={next(9)} />;
      case 9: return <ReadyStep onFinish={handleFinish} />;
      default: return null;
    }
  };

  // Step 1 auto-advances from step 0 once a vault is connected, so going back there
  // would immediately bounce forward again — disable the back arrow on that landing.
  // Within step 1's creation sub-flow, the back arrow navigates sub-steps instead.
  const inCreationSubStep = step === 0 && !!createVaultFlow.subStep && createVaultFlow.subStep !== "installing";
  const canGoBack = inCreationSubStep || (step > 0 && step !== 1);

  const handleBack = () => {
    if (inCreationSubStep) {
      createVaultFlow.goBack();
    } else if (canGoBack) {
      setStep(step - 1);
    }
  };

  return (
    <DialogModal
      isOpened={showWizard}
      onClose={handleFinish}
      styles="!max-w-[calc(100vw-2rem)] sm:!max-w-[calc(100vw-3rem)] lg:!max-w-4xl xl:!max-w-5xl"
      mobileSheet
      hideCloseButton
    >
      <div className="relative">
        {step > 0 && (
          <div className="flex items-center justify-between mb-5">
            <Button
              variant="unstyled"
              onClick={handleBack}
              aria-label="Back"
              tabIndex={canGoBack ? 0 : -1}
              className={`p-1.5 -ml-1.5 rounded-full transition-all active:scale-90 ${
                canGoBack
                  ? "opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10"
                  : "opacity-0 pointer-events-none"
              }`}
            >
              <HiOutlineArrowLeft size={18} />
            </Button>

            <div className="flex gap-1.5">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${i <= step ? "w-4 bg-sage" : "w-1 bg-neutral-200 dark:bg-neutral-800"}`}
                />
              ))}
            </div>

            {step < TOTAL_STEPS ? (
              <Button
                variant="unstyled"
                onClick={handleFinish}
                className="text-[11px] font-bold uppercase tracking-wider opacity-40 hover:opacity-100 transition-opacity"
              >
                Skip
              </Button>
            ) : (
              <span className="w-[18px]" />
            )}
          </div>
        )}

        <div key={step} className="animate-in fade-in slide-in-from-right-2 duration-300">
          {renderStep()}
        </div>
      </div>
    </DialogModal>
  );
};

export default WelcomeWizard;

"use client";

import { useState, useEffect } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { atom_hasCompletedOnboarding, atom_homeFeedOpen, atom_isWizardOpen, atom_renderedFontSize, atom_welcomeDeferred, atom_welcomeWizardStep } from "@/app/atoms/atoms";
import {
  atom_vaultHandle
} from "@/app/atoms/vault-atoms";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import Button from "@/app/components/Button";
import { HiOutlineArrowLeft } from "react-icons/hi";
import { useCreateVault } from "@/app/hooks/file-system/use-create-vault";
import ReadyStep from "./welcome-wizard/ReadyStep";
import VaultStep from "./welcome-wizard/VaultStep";

// Two steps: 0 vault, 1 ready to write. Everything else (name, look,
// layout, writing, AI) has a sensible default and lives in Settings.
const VAULT_STEP = 0;
const READY_STEP = 1;
const STEP_COUNT = 2;
// "Medium" in the text size step.
const ONBOARDING_TEXT_SIZE = "17px";

const WelcomeWizard = ({ initialStep = 0 }: { initialStep?: number }) => {
  const [hasCompleted, setHasCompleted] = useAtom(atom_hasCompletedOnboarding);
  const [isWizardOpen, setIsWizardOpen] = useAtom(atom_isWizardOpen);
  // A tool handoff (useToolHandoff) holds the first-run tour until the next visit.
  const welcomeDeferred = useAtomValue(atom_welcomeDeferred);
  const [step, setStep] = useAtom(atom_welcomeWizardStep);
  const [isMounted, setIsMounted] = useState(false);

  const createVaultFlow = useCreateVault();

  const vaultHandle = useAtomValue(atom_vaultHandle);
  const setHomeFeedOpen = useSetAtom(atom_homeFeedOpen);
  const setRenderedFontSize = useSetAtom(atom_renderedFontSize);

  useEffect(() => {
    setIsMounted(true);
    if (initialStep !== 0) setStep(initialStep);
  }, [initialStep, setStep]);

  // First-run onboarding starts at Medium text size, unless a size was
  // already chosen (re-running the tour never changes it).
  useEffect(() => {
    if (hasCompleted) return;
    let hasStoredSize = true;
    try {
      hasStoredSize = window.localStorage.getItem("renderedFontSize") !== null;
    } catch {
      // Storage unavailable: leave the size alone.
    }
    if (!hasStoredSize) setRenderedFontSize(ONBOARDING_TEXT_SIZE);
  }, [hasCompleted, setRenderedFontSize]);

  // The vault step moves on by itself once a vault is connected.
  useEffect(() => {
    if (step === VAULT_STEP && vaultHandle) {
      setStep(READY_STEP);
    }
  }, [step, vaultHandle, setStep]);

  // A step saved by an older, longer tour lands on the last step instead of
  // a blank one.
  useEffect(() => {
    if (step > READY_STEP) setStep(READY_STEP);
  }, [step, setStep]);

  const showWizard = isMounted && (isWizardOpen || (!hasCompleted && !welcomeDeferred));

  // Finishing (or skipping) lands on the home feed when a vault is open,
  // whatever the "On vault open" setting says.
  const finish = () => {
    setHasCompleted(true);
    setIsWizardOpen(false);
    setStep(VAULT_STEP);
    if (vaultHandle) setHomeFeedOpen(true);
  };

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

      // The vault step has no default action.
      if (step === READY_STEP) {
        event.preventDefault();
        finish();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  if (!showWizard) return null;

  const handleFinish = () => finish();

  const renderStep = () =>
    step === READY_STEP
      ? <ReadyStep onFinish={handleFinish} />
      : <VaultStep createVaultFlow={createVaultFlow} />;

  // Back only exists inside the vault step's creation sub-flow: the ready
  // step is reached by connecting a vault, so going back would bounce forward.
  const inCreationSubStep = step === VAULT_STEP && !!createVaultFlow.subStep && createVaultFlow.subStep !== "installing";
  const canGoBack = inCreationSubStep;

  const handleBack = () => {
    if (inCreationSubStep) createVaultFlow.goBack();
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
            {Array.from({ length: STEP_COUNT }, (_, i) => i).map((i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${i <= step ? "w-4 bg-sage" : "w-1 bg-neutral-200 dark:bg-neutral-800"}`}
              />
            ))}
          </div>

          {/* Writing without a vault (a draft) is fine: Skip finishes the tour. */}
          {step === VAULT_STEP ? (
            <Button
              variant="unstyled"
              onClick={handleFinish}
              className="text-ui-caption font-bold uppercase tracking-wider opacity-40 hover:opacity-100 transition-opacity"
            >
              Skip
            </Button>
          ) : (
            <span className="w-[18px]" />
          )}
        </div>

        <div key={step} className="animate-in fade-in slide-in-from-right-2 duration-300">
          {renderStep()}
        </div>
      </div>
    </DialogModal>
  );
};

export default WelcomeWizard;

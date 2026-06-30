"use client";

import React, { useState, useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  atom_hasCompletedOnboarding,
  atom_isWizardOpen,
  atom_welcomeWizardStep,
  atom_autosaveMode,
  atom_frontmatterDefaultMode,
  atom_fontSize,
  atom_fontFamily,
  atom_lineHeight,
  atom_letterSpacing,
} from "@/app/atoms/atoms";
import {
  atom_vaultHandle
} from "@/app/atoms/vault-atoms";
import {
  atom_isDriveVault,
  atom_driveVaultId
} from "@/app/atoms/drive-atoms";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import Button from "@/app/components/Button";
import { SelectControl, SegmentedControl } from "@/app/editor/settings/components/SettingControls";
import { FONT_SIZES, LINE_HEIGHTS, LETTER_SPACINGS, FONTS } from "@/app/editor/settings/font-options";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { formatShortcut } from "@/app/utils/platform";
import useIsMobileChrome from "@/app/hooks/use-mobile-chrome";
import {
  HiOutlineFolder,
  HiOutlineCloud,
  HiOutlineChevronRight,
  HiOutlineCheckCircle,
  HiOutlineRefresh,
  HiOutlineMenu,
  HiOutlineDocumentText,
  HiOutlineSwitchVertical,
  HiOutlineColorSwatch,
  HiOutlineArrowLeft,
  HiOutlineViewList,
  HiCheck,
  HiOutlineFolderAdd,
} from "react-icons/hi";
import { useCreateVault } from "@/app/hooks/file-system/use-create-vault";
import CreateVaultSubSteps from "./CreateVaultSubSteps";

const TOTAL_STEPS = 7;

const WelcomeWizard = ({ initialStep = 0 }: { initialStep?: number }) => {
  const [hasCompleted, setHasCompleted] = useAtom(atom_hasCompletedOnboarding);
  const [isWizardOpen, setIsWizardOpen] = useAtom(atom_isWizardOpen);
  const [step, setStep] = useAtom(atom_welcomeWizardStep);
  const [isMounted, setIsMounted] = useState(false);

  const { openVault, openDriveVaultPicker, isVaultSupported } = useFileSystem();
  const createVaultFlow = useCreateVault();

  const vaultHandle = useAtomValue(atom_vaultHandle);
  const isDriveVault = useAtomValue(atom_isDriveVault);
  const driveVaultId = useAtomValue(atom_driveVaultId);
  const [autosaveMode, setAutosaveMode] = useAtom(atom_autosaveMode);
  const [frontmatterDefaultMode, setFrontmatterDefaultMode] = useAtom(atom_frontmatterDefaultMode);
  const [fontSize, setFontSize] = useAtom(atom_fontSize);
  const [fontFamily, setFontFamily] = useAtom(atom_fontFamily);
  const [lineHeight, setLineHeight] = useAtom(atom_lineHeight);
  const [letterSpacing, setLetterSpacing] = useAtom(atom_letterSpacing);
  const isMobileChrome = useIsMobileChrome();

  useEffect(() => {
    setIsMounted(true);
    if (initialStep !== 0) setStep(initialStep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (step === 1 && (vaultHandle || (isDriveVault && driveVaultId))) {
      setStep(2);
    }
  }, [step, vaultHandle, isDriveVault, driveVaultId]);

  const showWizard = isMounted && (!hasCompleted || isWizardOpen);

  if (!showWizard) return null;

  const handleFinish = () => {
    setHasCompleted(true);
    setIsWizardOpen(false);
    setStep(0);
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="flex flex-col items-center text-center space-y-7 py-4">
            <div className="w-20 h-20 bg-sage/10 rounded-3xl flex items-center justify-center text-sage relative">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-sage rounded-full flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            </div>
            <div className="space-y-2.5">
              <h2 className="text-ui-title-2 font-bold tracking-tight">Welcome to HermesMarkdown</h2>
              <p className="text-ui-subhead opacity-60 px-2 leading-relaxed">
                Plain <code className="text-[0.85em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">.md</code> files, structured so your AI agents know exactly what to read.
              </p>
            </div>
            <Button variant="primary" onClick={() => setStep(1)} className="w-full h-12 rounded-2xl text-ui-footnote font-bold">
              Set up vault
            </Button>
          </div>
        );

      case 1:
        if (createVaultFlow.subStep) {
          return <CreateVaultSubSteps {...createVaultFlow} />;
        }
        return (
          <div className="flex flex-col items-center text-center space-y-6 py-4">
            <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400">
              <HiOutlineFolder size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-ui-title-3 font-bold">Connect Your Vault</h2>
              <p className="text-ui-footnote opacity-60 px-4">
                Pick where your notes live. A <code className="not-italic">.hermes</code> folder
                goes alongside them — an index for agents to read later, nothing you need to
                touch. Drive sync is optional, on or off anytime.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 w-full">
              <Button
                variant="secondary"
                onClick={createVaultFlow.startCreationFlow}
                disabled={!isVaultSupported}
                className="flex items-center justify-between px-5 h-14 rounded-2xl border border-edge bg-paper-light dark:bg-paper-dark"
              >
                <div className="flex items-center gap-3">
                  <HiOutlineFolderAdd className="text-sage" size={24} />
                  <div className="text-left">
                    <div className="font-bold text-ui-footnote">Create New Vault</div>
                    <div className="text-[10px] opacity-50 uppercase tracking-wider font-bold">New folder · Starter packs</div>
                  </div>
                </div>
                <HiOutlineChevronRight opacity={0.3} />
              </Button>

              <Button
                variant="secondary"
                onClick={openVault}
                disabled={!isVaultSupported}
                className="flex items-center justify-between px-5 h-14 rounded-2xl border border-edge bg-paper-light dark:bg-paper-dark"
              >
                <div className="flex items-center gap-3">
                  <HiOutlineFolder className="text-amber-500" size={24} />
                  <div className="text-left">
                    <div className="font-bold text-ui-footnote">Open Existing Vault</div>
                    <div className="text-[10px] opacity-50 uppercase tracking-wider font-bold">Offline · No upload</div>
                  </div>
                </div>
                <HiOutlineChevronRight opacity={0.3} />
              </Button>

              <Button
                variant="secondary"
                onClick={openDriveVaultPicker}
                className="flex items-center justify-between px-5 h-14 rounded-2xl border border-edge bg-paper-light dark:bg-paper-dark"
              >
                <div className="flex items-center gap-3">
                  <HiOutlineCloud className="text-sage" size={24} />
                  <div className="text-left">
                    <div className="font-bold text-ui-footnote">Google Drive</div>
                    <div className="text-[10px] opacity-50 uppercase tracking-wider font-bold">Cloud Backup</div>
                  </div>
                </div>
                <HiOutlineChevronRight opacity={0.3} />
              </Button>
            </div>
            {!isVaultSupported && (
              <p className="text-[11px] text-red-500 font-medium">
                Local folder access requires Chrome, Edge, or Brave.
              </p>
            )}
          </div>
        );

      case 2:
        return (
          <div className="flex flex-col items-center text-center space-y-6 py-4">
            <div className="w-16 h-16 bg-sage/10 rounded-2xl flex items-center justify-center text-sage">
              <HiOutlineDocumentText size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-ui-title-3 font-bold">Text Size</h2>
              <p className="text-ui-footnote opacity-60 px-4">
                How large should your words be? You can change this later in Settings.
              </p>
            </div>

            <div className="w-full space-y-3 text-left">
              <p
                style={{ fontSize, fontFamily }}
                className="px-1 leading-snug text-ink-light dark:text-ink-dark transition-all duration-200"
              >
                The quick brown fox jumps.
              </p>
              <div className="rounded-2xl border border-edge p-4 bg-paper-softgray/40 dark:bg-paper-dark/30">
                <label className="text-[11px] font-bold uppercase tracking-wider ml-1 opacity-70 block mb-2">Size</label>
                <SegmentedControl options={FONT_SIZES} value={fontSize} onChange={setFontSize} />
              </div>
            </div>

            <Button variant="primary" onClick={() => setStep(3)} className="w-full h-12 rounded-2xl text-ui-footnote font-bold">
              Continue
            </Button>
          </div>
        );

      case 3:
        return (
          <div className="flex flex-col items-center text-center space-y-6 py-4">
            <div className="w-16 h-16 bg-sage/10 rounded-2xl flex items-center justify-center text-sage">
              <HiOutlineSwitchVertical size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-ui-title-3 font-bold">Spacing</h2>
              <p className="text-ui-footnote opacity-60 px-4">
                Breathing room between lines and letters.
              </p>
            </div>

            <div className="w-full space-y-3 text-left">
              <p
                style={{ lineHeight, letterSpacing, fontFamily }}
                className="px-1 text-ui-footnote text-ink-light dark:text-ink-dark transition-all duration-200"
              >
                The quick brown fox jumps over the lazy dog.
              </p>
              <div className="rounded-2xl border border-edge p-4 space-y-4 bg-paper-softgray/40 dark:bg-paper-dark/30">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider ml-1 opacity-70 block">Line Height</label>
                  <SegmentedControl options={LINE_HEIGHTS} value={lineHeight} onChange={setLineHeight} />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider ml-1 opacity-70 block">Letter Spacing</label>
                  <SegmentedControl options={LETTER_SPACINGS} value={letterSpacing} onChange={setLetterSpacing} />
                </div>
              </div>
            </div>

            <Button variant="primary" onClick={() => setStep(4)} className="w-full h-12 rounded-2xl text-ui-footnote font-bold">
              Continue
            </Button>
          </div>
        );

      case 4:
        return (
          <div className="flex flex-col items-center text-center space-y-6 py-4">
            <div className="w-16 h-16 bg-sage/10 rounded-2xl flex items-center justify-center text-sage">
              <HiOutlineColorSwatch size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-ui-title-3 font-bold">Typeface</h2>
              <p className="text-ui-footnote opacity-60 px-4">
                Choose the font used in the editor.
              </p>
            </div>

            <div className="w-full text-left">
              <label className="text-[11px] font-bold uppercase tracking-wider ml-1 opacity-70 block mb-2">Font</label>
              <div className="rounded-2xl border border-edge px-4 bg-paper-softgray/40 dark:bg-paper-dark/30 max-h-[40vh] overflow-y-auto">
                {FONTS.map((f) => {
                  const isActive = fontFamily === f.value;
                  return (
                    <button
                      key={f.label}
                      type="button"
                      onClick={() => setFontFamily(f.value)}
                      className="w-full flex items-center justify-between gap-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800/40 last:border-0 focus:outline-none active:scale-[0.99] transition-transform"
                    >
                      <div className="flex flex-col items-start gap-1 min-w-0">
                        <span className={`text-ui-footnote font-medium leading-none ${isActive ? "text-sage dark:text-sage" : "text-ink-light dark:text-ink-dark"}`}>
                          {f.label}
                        </span>
                        <span style={{ fontFamily: f.value }} className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate">
                          The quick brown fox 0123
                        </span>
                      </div>
                      {isActive && <HiCheck size={15} className="shrink-0 text-sage dark:text-sage" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button variant="primary" onClick={() => setStep(5)} className="w-full h-12 rounded-2xl text-ui-footnote font-bold">
              Continue
            </Button>
          </div>
        );

      case 5:
        return (
          <div className="flex flex-col items-center text-center space-y-6 py-4">
            <div className="w-16 h-16 bg-sage/10 rounded-2xl flex items-center justify-center text-sage">
              <HiOutlineRefresh size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-ui-title-3 font-bold">Autosave</h2>
              <p className="text-ui-footnote opacity-60 px-4">
                Choose when changes get written to disk. You can change this later.
              </p>
            </div>

            <div className="w-full text-left">
              <div className="rounded-2xl border border-edge p-4 space-y-2 bg-paper-softgray/40 dark:bg-paper-dark/30">
                <label className="text-[11px] font-bold uppercase tracking-wider ml-1 opacity-70">Autosave</label>
                <SelectControl value={autosaveMode} onChange={(v) => setAutosaveMode(v as any)}>
                  <option value="afterDelay">After 2s Delay</option>
                  <option value="onFocusChange">On Focus Change</option>
                  <option value="manual">Manual Only</option>
                </SelectControl>
              </div>
            </div>

            <Button variant="primary" onClick={() => setStep(6)} className="w-full h-12 rounded-2xl text-ui-footnote font-bold">
              Continue
            </Button>
          </div>
        );

      case 6:
        return (
          <div className="flex flex-col items-center text-center space-y-6 py-4">
            <div className="w-16 h-16 bg-sage/10 rounded-2xl flex items-center justify-center text-sage">
              <HiOutlineViewList size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-ui-title-3 font-bold">Frontmatter View</h2>
              <p className="text-ui-footnote opacity-60 px-4">
                How should note metadata open by default — structured fields or raw YAML?
              </p>
            </div>

            <div className="w-full rounded-2xl border border-edge p-4 space-y-4 bg-paper-softgray/40 dark:bg-paper-dark/30 text-left">
              <div className="space-y-3">
                {(["fields", "raw"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFrontmatterDefaultMode(opt)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                      frontmatterDefaultMode === opt
                        ? "border-sage bg-sage/5 dark:bg-sage/10"
                        : "border-edge bg-paper-light dark:bg-paper-dark hover:border-sage/40"
                    }`}
                  >
                    <div className="text-left">
                      <div className={`text-ui-footnote font-semibold ${frontmatterDefaultMode === opt ? "text-sage" : ""}`}>
                        {opt === "fields" ? "Fields" : "Raw YAML"}
                      </div>
                      <div className="text-[11px] opacity-50 mt-0.5">
                        {opt === "fields" ? "Editable form with labels and inputs" : "Direct YAML text editor"}
                      </div>
                    </div>
                    {frontmatterDefaultMode === opt && <HiCheck size={15} className="shrink-0 text-sage" />}
                  </button>
                ))}
              </div>
            </div>

            <Button variant="primary" onClick={() => setStep(7)} className="w-full h-12 rounded-2xl text-ui-footnote font-bold">
              Continue
            </Button>
          </div>
        );

      case 7:
        return (
          <div className="flex flex-col items-center text-center space-y-6 py-4">
            <div className="w-16 h-16 bg-sage rounded-2xl flex items-center justify-center text-white">
              <HiOutlineCheckCircle size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-ui-title-3 font-bold">You&apos;re ready to write.</h2>
              <p className="text-ui-footnote opacity-60 px-4">
                Your vault is set up. Everything else — agent indexing, syntax helpers —
                happens as you go.
              </p>
            </div>

            <p className="text-[11px] opacity-50 flex flex-wrap items-center justify-center text-center gap-x-1.5 gap-y-1 leading-relaxed">
              {isMobileChrome ? (
                <>
                  <span>Tap</span>
                  <HiOutlineMenu className="inline shrink-0" size={14} />
                  <span>anytime to open the command palette</span>
                </>
              ) : (
                <>
                  <span>Press</span>
                  <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-paper-softgray dark:bg-paper-dark-surface text-ink-muted dark:text-fg-faint border border-edge">
                    {formatShortcut("p", { shift: true })}
                  </kbd>
                  <span>anytime to open the command palette</span>
                </>
              )}
            </p>

            <Button variant="primary" onClick={handleFinish} className="w-full h-12 rounded-2xl text-ui-footnote font-bold">
              Open Editor
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  // Step 2 auto-advances from step 1 once a vault is connected, so going back there
  // would immediately bounce forward again — disable the back arrow on that landing.
  // Within step 1's creation sub-flow, the back arrow navigates sub-steps instead.
  const inCreationSubStep = step === 1 && !!createVaultFlow.subStep && createVaultFlow.subStep !== "installing";
  const canGoBack = inCreationSubStep || (step > 0 && step !== 2);

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
      styles="!max-w-sm"
      mobileSheet
      hideCloseButton
    >
      <div className="relative">
        {step > 0 && (
          <div className="flex items-center justify-between mb-5">
            <button
              type="button"
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
            </button>

            <div className="flex gap-1.5">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${i <= step ? "w-4 bg-sage" : "w-1 bg-neutral-200 dark:bg-neutral-800"}`}
                />
              ))}
            </div>

            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={handleFinish}
                className="text-[11px] font-bold uppercase tracking-wider opacity-40 hover:opacity-100 transition-opacity"
              >
                Skip
              </button>
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

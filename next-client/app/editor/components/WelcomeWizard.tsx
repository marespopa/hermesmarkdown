"use client";

import React, { useState, useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  atom_hasCompletedOnboarding,
  atom_isWizardOpen,
  atom_autosaveMode
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
import { SelectControl } from "@/app/editor/settings/components/SettingControls";
import { useFileSystem } from "@/app/hooks/use-file-system";
import {
  HiOutlineFolder,
  HiOutlineCloud,
  HiOutlineChevronRight,
  HiOutlineCheckCircle,
  HiOutlineRefresh,
} from "react-icons/hi";

const WelcomeWizard = ({ initialStep = 0 }: { initialStep?: number }) => {
  const [hasCompleted, setHasCompleted] = useAtom(atom_hasCompletedOnboarding);
  const [isWizardOpen, setIsWizardOpen] = useAtom(atom_isWizardOpen);
  const [step, setStep] = useState(initialStep);
  const [isMounted, setIsMounted] = useState(false);

  const { openVault, openDriveVaultPicker, isVaultSupported } = useFileSystem();

  const vaultHandle = useAtomValue(atom_vaultHandle);
  const isDriveVault = useAtomValue(atom_isDriveVault);
  const driveVaultId = useAtomValue(atom_driveVaultId);
  const [autosaveMode, setAutosaveMode] = useAtom(atom_autosaveMode);

  useEffect(() => {
    setIsMounted(true);
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
                onClick={openVault}
                disabled={!isVaultSupported}
                className="flex items-center justify-between px-5 h-14 rounded-2xl border border-edge bg-paper-light dark:bg-paper-dark"
              >
                <div className="flex items-center gap-3">
                  <HiOutlineFolder className="text-amber-500" size={24} />
                  <div className="text-left">
                    <div className="font-bold text-ui-footnote">Local Folder</div>
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
              <HiOutlineRefresh size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-ui-title-3 font-bold">Autosave</h2>
              <p className="text-ui-footnote opacity-60 px-4">
                Choose when changes get written to disk. You can change this later.
              </p>
            </div>

            <div className="w-full space-y-4 text-left">
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider ml-1">Autosave</label>
                <SelectControl value={autosaveMode} onChange={(v) => setAutosaveMode(v as any)}>
                  <option value="afterDelay">After 2s Delay</option>
                  <option value="onFocusChange">On Focus Change</option>
                  <option value="manual">Manual Only</option>
                </SelectControl>
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

            <Button variant="primary" onClick={handleFinish} className="w-full h-12 rounded-2xl text-ui-footnote font-bold">
              Open Editor
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <DialogModal
      isOpened={showWizard}
      onClose={handleFinish}
      styles="!max-w-sm"
    >
      <div className="relative">
        {step > 0 && (
          <div className="absolute -top-10 left-0 right-0 flex gap-1.5 justify-center">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${i <= step ? "w-4 bg-sage" : "w-1 bg-neutral-200 dark:bg-neutral-800"}`}
              />
            ))}
          </div>
        )}

        {renderStep()}

        {step > 0 && step < 3 && (
          <button
            onClick={handleFinish}
            className="w-full mt-4 text-[11px] font-bold uppercase tracking-wider opacity-30 hover:opacity-100 transition-opacity"
          >
            Skip Setup
          </button>
        )}
      </div>
    </DialogModal>
  );
};

export default WelcomeWizard;

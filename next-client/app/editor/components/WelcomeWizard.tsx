"use client";

import React, { useState, useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import { 
  atom_hasCompletedOnboarding, 
  atom_isWizardOpen, 
  atom_currency, 
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
  HiOutlineCode,
  HiOutlineTerminal,
  HiOutlineChartBar,
  HiOutlineCloud,
  HiOutlineSparkles,
  HiOutlineChevronRight,
  HiOutlineCheckCircle,
  HiOutlineCurrencyDollar,
} from "react-icons/hi";

const WelcomeWizard = ({ initialStep = 0 }: { initialStep?: number }) => {
  const [hasCompleted, setHasCompleted] = useAtom(atom_hasCompletedOnboarding);
  const [isWizardOpen, setIsWizardOpen] = useAtom(atom_isWizardOpen);
  const [step, setStep] = useState(initialStep);
  const [isMounted, setIsMounted] = useState(false);

  // Connection Hooks
  const { openVault, openDriveVaultPicker, isVaultSupported } = useFileSystem();
  
  // State Atoms
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const isDriveVault = useAtomValue(atom_isDriveVault);
  const driveVaultId = useAtomValue(atom_driveVaultId);
  const [currency, setCurrency] = useAtom(atom_currency);
  const [autosaveMode, setAutosaveMode] = useAtom(atom_autosaveMode);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Step 1 -> 2 transition: proceed to Preferences when vault is connected
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
      case 0: // Welcome
        return (
          <div className="flex flex-col items-center text-center space-y-6 py-4">
            <div className="w-20 h-20 bg-sage/10 dark:bg-sage/10 rounded-3xl flex items-center justify-center text-sage dark:text-sage">
              <HiOutlineSparkles size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-ui-title-2 font-bold tracking-tight">Welcome to HermesMD</h2>
              <p className="text-ui-subhead opacity-70 px-4">
                Your local-first, AI-enhanced Markdown vault. Let's get you set up in less than a minute.
              </p>
            </div>
            <Button variant="primary" onClick={() => setStep(1)} className="w-full h-12 rounded-2xl text-ui-footnote font-bold">
              Start Setup
            </Button>
          </div>
        );

      case 1: // Connect Vault
        return (
          <div className="flex flex-col items-center text-center space-y-6 py-4">
            <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400">
              <HiOutlineFolder size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-ui-title-3 font-bold">Connect Your Vault</h2>
              <p className="text-ui-footnote opacity-70 px-4">
                Choose where your notes live. Local folders stay on your device, or sync via Google Drive.
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
                    <div className="text-[10px] opacity-50 uppercase tracking-wider font-bold">Local-First</div>
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
                    <div className="text-[10px] opacity-50 uppercase tracking-wider font-bold">Cloud Sync</div>
                  </div>
                </div>
                <HiOutlineChevronRight opacity={0.3} />
              </Button>
            </div>
            {!isVaultSupported && (
              <p className="text-[11px] text-red-500 font-medium">
                Local folder access is not supported in this browser. Please use Chrome, Edge, or Brave.
              </p>
            )}
          </div>
        );

      case 2: // Preferences
        return (
          <div className="flex flex-col items-center text-center space-y-6 py-4">
            <div className="w-16 h-16 bg-sage/10 dark:bg-sage/10 rounded-2xl flex items-center justify-center text-sage dark:text-sage">
              <HiOutlineCurrencyDollar size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-ui-title-3 font-bold">Configure Preferences</h2>
              <p className="text-ui-footnote opacity-70 px-4">
                Set your preferred currency for financial tables and choose how your work is saved.
              </p>
            </div>

            <div className="w-full space-y-4 text-left">
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider opacity-40 ml-1">Currency</label>
                <SelectControl value={currency} onChange={setCurrency}>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="RON">RON (lei)</option>
                </SelectControl>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider opacity-40 ml-1">Autosave</label>
                <SelectControl value={autosaveMode} onChange={(v) => setAutosaveMode(v as any)}>
                  <option value="afterDelay">After 2s Delay</option>
                  <option value="onFocusChange">On Focus Change</option>
                  <option value="manual">Manual Only</option>
                </SelectControl>
              </div>
            </div>

            <Button variant="primary" onClick={() => setStep(3)} className="w-full h-12 rounded-2xl text-ui-footnote font-bold">
              Finish Setup
            </Button>
          </div>
        );

      case 3: // Showcase / Done
        return (
          <div className="flex flex-col items-center text-center space-y-6 py-4">
            <div className="w-16 h-16 bg-sage rounded-2xl flex items-center justify-center text-white shadow-lg shadow-sage/20">
              <HiOutlineCheckCircle size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-ui-title-3 font-bold">You're All Set!</h2>
              <p className="text-ui-footnote opacity-70 px-4">
                HermesMD is ready. Here's a quick reminder of what's inside:
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full">
               <div className="p-3 rounded-2xl bg-paper-softgray dark:bg-paper-dark/30 border border-beige-light dark:border-clay text-left space-y-1">
                 <HiOutlineSparkles className="text-sage" size={18} />
                 <div className="text-[11px] font-bold">AI toolbar</div>
                 <div className="text-[10px] opacity-50 leading-tight">Select text to improve or expand.</div>
               </div>
               <div className="p-3 rounded-2xl bg-paper-softgray dark:bg-paper-dark/30 border border-beige-light dark:border-clay text-left space-y-1">
                 <HiOutlineCode className="text-amber-500" size={18} />
                 <div className="text-[11px] font-bold">Smart Metadata</div>
                 <div className="text-[10px] opacity-50 leading-tight">Auto-injected frontmatter and tags.</div>
               </div>
               <div className="p-3 rounded-2xl bg-paper-softgray dark:bg-paper-dark/30 border border-beige-light dark:border-clay text-left space-y-1">
                 <HiOutlineChartBar className="text-sage" size={18} />
                 <div className="text-[11px] font-bold">Readability</div>
                 <div className="text-[10px] opacity-50 leading-tight">Live agent-readability scoring.</div>
               </div>
               <div className="p-3 rounded-2xl bg-paper-softgray dark:bg-paper-dark/30 border border-beige-light dark:border-clay text-left space-y-1">
                 <HiOutlineTerminal className="text-emerald-500" size={18} />
                 <div className="text-[11px] font-bold">Slash Commands</div>
                 <div className="text-[10px] opacity-50 leading-tight">Type / for templates and context.</div>
               </div>
            </div>

            <Button variant="primary" onClick={handleFinish} className="w-full h-12 rounded-2xl text-ui-footnote font-bold">
              Get Started
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
        {/* Progress Bar */}
        {step > 0 && (
          <div className="absolute -top-10 left-0 right-0 flex gap-1.5 justify-center">
            {[1, 2, 3].map((i) => (
              <div 
                key={i} 
                className={`h-1 rounded-full transition-all ${i <= step ? "w-4 bg-sage" : "w-1 bg-neutral-200 dark:bg-neutral-800"}`} 
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

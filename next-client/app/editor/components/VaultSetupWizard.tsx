"use client";

import React, { useState, useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  atom_frontmatterWizardOpen,
  atom_vaultSetupWizardOpen,
  atom_autoInjectFrontmatter,
  atom_frontmatterHasPrompted,
} from "@/app/atoms/ui-atoms";
import { atom_vaultHandle, atom_vaultSetupStatus } from "@/app/atoms/vault-atoms";
import { atom_isDriveVault, atom_driveVaultId, atom_drivePathIndex, atom_driveAuthState } from "@/app/atoms/drive-atoms";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import Button from "@/app/components/Button";
import { LATEST_AGENT_VERSION } from "@/app/utils/agent-version";
import { 
  MANAGED_FILES, 
  checkVaultFiles, 
  installVaultFiles, 
  FileInstallStatus 
} from "@/app/services/vault-setup";

export default function VaultSetupWizard() {
  const [wizardPath, setWizardPath] = useAtom(atom_vaultSetupWizardOpen);
  const [, setFmWizardPath] = useAtom(atom_frontmatterWizardOpen);
  const isOpen = wizardPath !== null;
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const [, setSetupStatus] = useAtom(atom_vaultSetupStatus);
  const [autoInject, setAutoInject] = useAtom(atom_autoInjectFrontmatter);
  const [, setFrontmatterHasPrompted] = useAtom(atom_frontmatterHasPrompted);
  const isDriveVault = useAtomValue(atom_isDriveVault);
  const driveVaultId = useAtomValue(atom_driveVaultId);
  const [drivePathIndex, setDrivePathIndex] = useAtom(atom_drivePathIndex);
  const [, setDriveAuthState] = useAtom(atom_driveAuthState);

  // Setup Checklist State
  const [installChecked, setInstallChecked] = useState<Record<string, boolean>>({});
  const [installResults, setInstallResults] = useState<Record<string, FileInstallStatus>>({});
  const [isInstalling, setIsInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    const hasVault = vaultHandle || (isDriveVault && driveVaultId);
    if (!isOpen || !hasVault) return;

    setInstallError(null);
    
    const checkFiles = async () => {
      const nextResults = await checkVaultFiles(
        vaultHandle,
        isDriveVault,
        driveVaultId,
        drivePathIndex
      );

      const initialChecked: Record<string, boolean> = {};
      Object.entries(nextResults).forEach(([path, status]) => {
        if (status === "missing" || status === "outdated") {
          initialChecked[path] = true;
        }
      });

      setInstallResults(nextResults);
      setInstallChecked(initialChecked);
    };

    checkFiles();
  }, [isOpen, vaultHandle, isDriveVault, driveVaultId, drivePathIndex]);

  if (!isOpen) return null;

  const closeAndContinue = () => {
    const path = wizardPath;
    setFrontmatterHasPrompted(true);
    setWizardPath(null);
    if (path && path !== "vault-root") {
      setFmWizardPath(path);
    }
  };

  const handleNext = async () => {
    const selected = MANAGED_FILES.filter(
      f => installChecked[f.path] && (installResults[f.path] === "missing" || installResults[f.path] === "outdated")
    );

    if (selected.length > 0) {
      setIsInstalling(true);
      setInstallError(null);
      try {
        await installVaultFiles(
          selected,
          vaultHandle,
          isDriveVault,
          driveVaultId,
          drivePathIndex
        );

        if (isDriveVault && driveVaultId && drivePathIndex) {
          drivePathIndex.saveToCache(driveVaultId);
          setDrivePathIndex(drivePathIndex);
        }

        setSetupStatus("configured");
        setIsInstalling(false);
        setInstallSuccess(true);
      } catch (err: any) {
        console.error("Setup failed:", err);
        if (err?.status === 401) setDriveAuthState("expired");
        setInstallError(err?.message || "An unexpected error occurred. Please try again.");
        setIsInstalling(false);
      }
    } else {
      closeAndContinue();
    }
  };

  const handleSkip = () => {
    localStorage.setItem("hermesSkipVaultSetup", LATEST_AGENT_VERSION);
    setSetupStatus("skipped");
    setFrontmatterHasPrompted(true);
    const path = wizardPath;
    setWizardPath(null);
    if (path && path !== "vault-root") {
      setFmWizardPath(path);
    }
  };

  const hasOutdatedFiles = Object.values(installResults).some(r => r === "outdated");

  return (
    <DialogModal
      isOpened={isOpen}
      onClose={() => setWizardPath(null)}
      onConfirm={handleNext}
      styles="sm:!max-w-md"
      mobileSheet
      ariaLabelledBy="vault-setup-heading"
    >
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col gap-1 pr-6">
          <h2
            id="vault-setup-heading"
            className="text-ui-body font-semibold text-ink-light dark:text-ink-dark"
          >
            {hasOutdatedFiles ? "Agent Skills Update" : "Vault Setup"}
          </h2>
          <p className="text-ui-footnote text-ink-muted dark:text-stone leading-relaxed">
            {hasOutdatedFiles
              ? "New versions of the agent-aware skill files are available for your vault."
              : "HermesMarkdown works best with a few helper files in your vault root — they guide AI tools like Cursor or Claude when you work with your notes. HermesMarkdown itself does not provide any AI agent."}
          </p>
        </div>

        {/* Success */}
        {installSuccess && (
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
              <p className="text-ui-footnote font-semibold text-emerald-700 dark:text-emerald-400">
                {hasOutdatedFiles ? "Skills updated successfully." : "Skills installed successfully."}
              </p>
              <p className="text-ui-caption text-emerald-600 dark:text-emerald-500">
                Your vault is ready. Agent-context files are in place.
              </p>
            </div>
            <div className="flex justify-end pt-1">
              <Button variant="primary" onClick={closeAndContinue}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className={`flex flex-col gap-4 ${installSuccess ? "hidden" : ""}`}>
          {/* Auto-inject preference — captured here instead of a separate dialog */}
          <label className="flex items-start gap-3 p-3 rounded-xl border border-beige-light dark:border-clay bg-paper-softgray/50 dark:bg-paper-dark/30 cursor-pointer">
            <input
              type="checkbox"
              checked={autoInject}
              onChange={(e) => setAutoInject(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-beige text-sage focus:ring-sage"
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-ui-footnote font-medium text-ink-light dark:text-ink-dark">
                Auto-inject Frontmatter on Save
              </span>
              <span className="text-ui-caption text-ink-muted dark:text-stone">
                Prepend title, status, tags, and scope to files that have no frontmatter block. You can change this any time in Settings.
              </span>
            </span>
          </label>

          {!vaultHandle && !isDriveVault ? (
            <p className="text-ui-footnote text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-100 dark:border-amber-800">
              Open a vault folder first to install these agent-context files.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {MANAGED_FILES.map((file) => (
                <div key={file.path} className="flex items-start gap-3 p-3 rounded-xl border border-beige-light dark:border-clay bg-paper-softgray/50 dark:bg-paper-dark/30">
                  <div className="pt-0.5">
                    <input
                      type="checkbox"
                      id={`setup-${file.path}`}
                      checked={installChecked[file.path] || installResults[file.path] === "installed"}
                      disabled={installResults[file.path] === "installed" || isInstalling}
                      onChange={(e) => setInstallChecked(prev => ({ ...prev, [file.path]: e.target.checked }))}
                      className="w-4 h-4 rounded border-beige text-sage focus:ring-sage disabled:opacity-50"
                    />
                  </div>
                  <label htmlFor={`setup-${file.path}`} className={`flex flex-col flex-1 cursor-pointer ${installResults[file.path] === "installed" ? "opacity-50" : ""}`}>
                    <span className="text-ui-footnote font-medium text-ink-light dark:text-ink-dark flex items-center gap-2">
                      {file.path}
                      {installResults[file.path] === "installed" && <span className="text-emerald-500 text-[10px] uppercase font-bold">Already Installed</span>}
                      {installResults[file.path] === "outdated" && <span className="text-sage text-[10px] uppercase font-bold">Update Available</span>}
                    </span>
                    <span className="text-ui-caption text-ink-muted dark:text-stone">
                      {file.description}
                    </span>
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {!installSuccess && installError && (
          <p className="text-ui-footnote text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2.5 rounded-lg border border-red-100 dark:border-red-800">
            {installError}
          </p>
        )}

        {/* Actions */}
        {!installSuccess && (
          <div className="flex items-center justify-between gap-2 pt-1">
            <Button variant="outlined" onClick={handleSkip} disabled={isInstalling}>
              Skip
            </Button>
            <Button variant="primary" onClick={handleNext} disabled={isInstalling || (!vaultHandle && !isDriveVault)}>
              {isInstalling ? (hasOutdatedFiles ? "Updating..." : "Installing...") : (hasOutdatedFiles ? "Update & Continue" : "Install & Continue")}
            </Button>
          </div>
        )}
      </div>
    </DialogModal>
  );
}

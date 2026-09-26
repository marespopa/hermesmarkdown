"use client";

import React, { useState, useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import { useRouter } from "next/navigation";
import {
  atom_hasCompletedOnboarding,
  atom_isWizardOpen,
  atom_welcomeWizardStep,
  atom_autosaveMode,
  atom_theme,
  type Theme,
  atom_editorFontFamily,
  atom_renderedFontSize,
  atom_aiProvider,
  atom_claudeKey,
  atom_geminiKey,
  atom_vimMode,
} from "@/app/atoms/atoms";
import { atom_githubVaultDialogOpen } from "@/app/atoms/ui-atoms";
import {
  atom_vaultHandle
} from "@/app/atoms/vault-atoms";
import { atom_lineNumbers } from "@/app/atoms/ui-atoms";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import Button from "@/app/components/Button";
import Input from "@/app/components/Input";
import Toggle from "@/app/components/Toggle";
import { testAIConnection } from "@/app/services/ai";
import { showSuccessToast, showErrorToast } from "@/app/components/Toastr";
import { SelectControl, SegmentedControl } from "@/app/editor/settings/components/SettingControls";
import { FONTS } from "@/app/editor/settings/font-options";
import FontPicker from "@/app/editor/settings/components/FontPicker";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { formatShortcut } from "@/app/utils/platform";
import useIsMobileChrome from "@/app/hooks/use-mobile-chrome";
import {
  HiOutlineFolder,
  HiOutlineChevronRight,
  HiOutlineCheckCircle,
  HiOutlineRefresh,
  HiOutlineMenu,
  HiOutlineColorSwatch,
  HiOutlineArrowLeft,
  HiOutlineViewList,
  HiOutlineFolderAdd,
  HiOutlineLightningBolt,
  HiOutlineDesktopComputer,
  HiOutlineCloudUpload,
} from "react-icons/hi";
import { useCreateVault } from "@/app/hooks/file-system/use-create-vault";
import CreateVaultSubSteps from "./CreateVaultSubSteps";

const TOTAL_STEPS = 8;

const THEME_OPTIONS: { label: string; value: Theme }[] = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "System", value: "system" },
];

const WelcomeWizard = ({ initialStep = 0 }: { initialStep?: number }) => {
  const [hasCompleted, setHasCompleted] = useAtom(atom_hasCompletedOnboarding);
  const [isWizardOpen, setIsWizardOpen] = useAtom(atom_isWizardOpen);
  const [step, setStep] = useAtom(atom_welcomeWizardStep);
  const [isMounted, setIsMounted] = useState(false);
  const [, setGitHubVaultDialogOpen] = useAtom(atom_githubVaultDialogOpen);

  const { openVault, isVaultSupported } = useFileSystem();
  const router = useRouter();
  const createVaultFlow = useCreateVault();

  const vaultHandle = useAtomValue(atom_vaultHandle);
  const [autosaveMode, setAutosaveMode] = useAtom(atom_autosaveMode);
  const [theme, setTheme] = useAtom(atom_theme);
  const [editorFontFamily, setEditorFontFamily] = useAtom(atom_editorFontFamily);
  const [renderedFontSize, setRenderedFontSize] = useAtom(atom_renderedFontSize);
  const [lineNumbers, setLineNumbers] = useAtom(atom_lineNumbers);
  const [vimMode, setVimMode] = useAtom(atom_vimMode);
  const [aiProvider, setAiProvider] = useAtom(atom_aiProvider);
  const [claudeKey, setClaudeKey] = useAtom(atom_claudeKey);
  const [geminiKey, setGeminiKey] = useAtom(atom_geminiKey);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isConnectionSuccessful, setIsConnectionSuccessful] = useState(false);
  const isMobileChrome = useIsMobileChrome();

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

  const connectGitHubVault = () => {
    setGitHubVaultDialogOpen(true);
  };

  const openExistingVault = async () => {
    if (await openVault()) router.push("/editor/files");
  };

  const renderStep = () => {
    switch (step) {
      case 0:
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
                Choose a folder for your notes. HermesMarkdown indexes your
                Markdown files locally so you can search and navigate your
                vault. Your notes stay on your device unless you choose GitHub
                sync.
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
                    <div className="text-[10px] opacity-50 uppercase tracking-wider font-bold">New folder · Empty vault</div>
                  </div>
                </div>
                <HiOutlineChevronRight opacity={0.3} />
              </Button>

              <Button
                variant="secondary"
                onClick={() => void openExistingVault()}
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
                onClick={connectGitHubVault}
                aria-label="Connect GitHub Vault"
                className="flex items-center justify-between px-5 h-14 rounded-2xl border border-edge bg-paper-light dark:bg-paper-dark"
              >
                <div className="flex items-center gap-3">
                  <HiOutlineCloudUpload className="text-sage" size={24} />
                  <div className="text-left">
                    <div className="font-bold text-ui-footnote">Connect GitHub Vault</div>
                    <div className="text-[10px] opacity-50 uppercase tracking-wider font-bold">GitHub · Manual sync</div>
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

      case 1:
        return (
          <div className="flex flex-col items-center text-center space-y-6 py-4">
            <div className="w-16 h-16 bg-sage/10 rounded-2xl flex items-center justify-center text-sage">
              <HiOutlineDesktopComputer size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-ui-title-3 font-bold">Theme</h2>
              <p className="text-ui-footnote opacity-60 px-4">
                System follows your OS's light/dark setting and switches automatically when it changes. You can change this later in Settings.
              </p>
            </div>

            <div className="w-full rounded-2xl border border-edge p-4 bg-paper-softgray/40 dark:bg-paper-dark/30">
              <SegmentedControl options={THEME_OPTIONS} value={theme} onChange={setTheme} />
            </div>

            <Button variant="primary" onClick={() => setStep(2)} className="w-full h-12 rounded-2xl text-ui-footnote font-bold">
              Continue
            </Button>
          </div>
        );

      case 2:
        return (
          <div className="flex flex-col items-center text-center space-y-6 py-4">
            <div className="w-16 h-16 bg-sage/10 rounded-2xl flex items-center justify-center text-sage">
              <HiOutlineColorSwatch size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-ui-title-3 font-bold">Make the editor feel like paper</h2>
              <p className="text-ui-footnote opacity-60 px-4">
                Choose a comfortable typeface for writing Markdown. You can change it later in Settings → Typography.
              </p>
            </div>

            <div className="w-full text-left">
              <div className="max-h-[40vh] overflow-y-auto">
                <FontPicker fonts={FONTS} value={editorFontFamily} onChange={setEditorFontFamily} />
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
              <HiOutlineColorSwatch size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-ui-title-3 font-bold">Choose your text size</h2>
              <p className="text-ui-footnote opacity-60 px-4">
                Set a comfortable reading size for your notes. You can adjust it
                later in Settings.
              </p>
            </div>

            <div className="w-full rounded-2xl border border-edge p-4 bg-paper-softgray/40 dark:bg-paper-dark/30 text-left">
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider opacity-70">
                Text size
              </label>
              <SelectControl
                value={renderedFontSize}
                onChange={setRenderedFontSize}
                ariaLabel="Text size"
              >
                <option value="14px">Small</option>
                <option value="16px">Medium</option>
                <option value="18px">Large</option>
                <option value="20px">Extra large</option>
                <option value="22px">Largest</option>
              </SelectControl>
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
              <HiOutlineViewList size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-ui-title-3 font-bold">Show line numbers?</h2>
              <p className="text-ui-footnote opacity-60 px-4">
                Line numbers make it easier to navigate and discuss specific parts of a note.
                You can change this later in Settings.
              </p>
            </div>

            <div className="w-full flex items-center justify-between rounded-2xl border border-edge p-4 bg-paper-softgray/40 dark:bg-paper-dark/30 text-left">
              <span className="text-ui-footnote font-semibold">Line numbers</span>
              <Toggle variant="soft" active={lineNumbers} onChange={setLineNumbers} />
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
              <HiOutlineLightningBolt size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-ui-title-3 font-bold">Use Vim keybindings?</h2>
              <p className="text-ui-footnote opacity-60 px-4">
                Enable Vim motions and editing modes in the source editor. You can change this later in Settings.
              </p>
            </div>

            <div className="w-full flex items-center justify-between rounded-2xl border border-edge p-4 bg-paper-softgray/40 dark:bg-paper-dark/30 text-left">
              <span className="text-ui-footnote font-semibold">Vim mode</span>
              <Toggle variant="soft" active={vimMode} onChange={setVimMode} />
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

            <Button variant="primary" onClick={() => setStep(7)} className="w-full h-12 rounded-2xl text-ui-footnote font-bold">
              Continue
            </Button>
          </div>
        );

      case 7: {
        const key = aiProvider === "gemini" ? geminiKey : claudeKey;
        const setKey = aiProvider === "gemini" ? setGeminiKey : setClaudeKey;
        return (
          <div className="flex flex-col items-center text-center space-y-4 py-2">
            <div className="w-12 h-12 bg-sage/10 rounded-2xl flex items-center justify-center text-sage shrink-0">
              <HiOutlineLightningBolt size={24} />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-ui-title-3 font-bold">AI Features (optional)</h2>
              <p className="text-ui-footnote opacity-60 px-4">
                Bring your own API key to unlock rewriting, summarizing, and chat.
                Stored locally in your browser only — never sent to us. Skip this
                anytime and add it later in Settings.
              </p>
            </div>

            <div className="w-full rounded-2xl border border-edge p-3.5 space-y-2.5 bg-paper-softgray/40 dark:bg-paper-dark/30 text-left">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider ml-1 opacity-70 block">Provider</label>
                <SelectControl
                  value={aiProvider}
                  onChange={(value) => {
                    setAiProvider(value as typeof aiProvider);
                    setIsConnectionSuccessful(false);
                  }}
                >
                  <option value="claude">Claude (Anthropic)</option>
                  <option value="gemini">Gemini (Google)</option>
                </SelectControl>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider ml-1 opacity-70 block">API Key</label>
                <Input
                  name="welcome-ai-key"
                  type="password"
                  value={key}
                  handleChange={(event) => {
                    setKey(event.target.value);
                    setIsConnectionSuccessful(false);
                  }}
                  placeholder={aiProvider === "gemini" ? "AIza..." : "sk-ant-..."}
                />
              </div>
              {isConnectionSuccessful ? (
                <div className="w-full h-9 rounded-xl bg-sage/10 text-sage flex items-center justify-center gap-1.5 text-ui-footnote font-semibold" role="status">
                  <HiOutlineCheckCircle size={17} />
                  Connection successful.
                </div>
              ) : (
                <Button
                  variant="secondary"
                  disabled={!key.trim() || isTestingConnection}
                  onClick={async () => {
                    setIsTestingConnection(true);
                    const result = await testAIConnection(aiProvider, key.trim());
                    setIsTestingConnection(false);
                    if (result.success) {
                      setIsConnectionSuccessful(true);
                      showSuccessToast("Connection successful.");
                    } else {
                      showErrorToast(result.error || "Connection failed.");
                    }
                  }}
                  className="w-full h-9 rounded-xl text-ui-footnote font-semibold"
                >
                  {isTestingConnection ? "Testing…" : "Test Connection"}
                </Button>
              )}
            </div>

            <Button variant="primary" onClick={() => setStep(8)} className="w-full h-11 rounded-2xl text-ui-footnote font-bold shrink-0">
              Continue
            </Button>
          </div>
        );
      }

      case 8:
        return (
          <div className="flex flex-col items-center text-center space-y-6 py-4">
            <div className="w-16 h-16 bg-sage/10 rounded-2xl flex items-center justify-center text-sage">
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
                    {formatShortcut("k")}
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

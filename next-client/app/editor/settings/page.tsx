"use client";

import React, { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { useRouter } from "next/navigation";
import {
  atom_wordWrap,
  atom_fontSize,
  atom_fontFamily,
  atom_lineHeight,
  atom_letterSpacing,
  atom_theme,
  atom_showStats,
  atom_isZenModeActive,
  atom_isWizardOpen,
  atom_autosaveMode,
  atom_autosaveDelay,
  atom_editorWidth,
  atom_currency,
  atom_autoInjectFrontmatter,
  atom_sidebarTabOrder,
  atom_aiProvider,
  atom_selectedAiModel,
  atom_claudeKey,
  atom_geminiKey,
  MONO_FONT_STACK,
} from "@/app/atoms/atoms";
import { atom_vaultSetupWizardOpen, atom_availableGeminiModels } from "@/app/atoms/ui-atoms";
import { atom_driveVaultId, atom_driveVaultName } from "@/app/atoms/drive-atoms";
import { useDriveAuth } from "@/app/hooks/drive/use-drive-auth";
import { testAIConnection, fetchGeminiModels } from "@/app/services/ai";
import {
  HiOutlineArrowLeft,
  HiOutlineDocumentText,
  HiOutlinePencilAlt,
  HiOutlineColorSwatch,
  HiOutlineAcademicCap,
  HiOutlineCloud,
  HiOutlineLightningBolt,
  HiCheck,
  HiChevronUp,
  HiChevronDown,
  HiOutlineRefresh,
} from "react-icons/hi";
import Button from "@/app/components/Button";
import Toggle from "@/app/components/Toggle";
import Input from "@/app/components/Input";
import { showSuccessToast, showErrorToast } from "@/app/components/Toastr";
import {
  SegmentedControl,
  SelectControl,
  SettingItem,
  SettingGroup,
} from "./components/SettingControls";

const SettingsPage = () => {
  const router = useRouter();

  const [fontSize, setFontSize] = useAtom(atom_fontSize);
  const [fontFamily, setFontFamily] = useAtom(atom_fontFamily);
  const [lineHeight, setLineHeight] = useAtom(atom_lineHeight);
  const [letterSpacing, setLetterSpacing] = useAtom(atom_letterSpacing);
  const [theme, setTheme] = useAtom(atom_theme);
  const [wordWrap, setWordWrap] = useAtom(atom_wordWrap);
  const [showStats, setShowStats] = useAtom(atom_showStats);
  const [isZenModeActive, setIsZenModeActive] = useAtom(atom_isZenModeActive);
  const [autosaveMode, setAutosaveMode] = useAtom(atom_autosaveMode);
  const [autosaveDelay, setAutosaveDelay] = useAtom(atom_autosaveDelay);
  const [editorWidth, setEditorWidth] = useAtom(atom_editorWidth);
  const [currencyCode, setCurrencyCode] = useAtom(atom_currency);
  const [autoInjectFrontmatter, setAutoInjectFrontmatter] = useAtom(atom_autoInjectFrontmatter);
  const [sidebarTabOrder, setSidebarTabOrder] = useAtom(atom_sidebarTabOrder);
  const [aiProvider, setAiProvider] = useAtom(atom_aiProvider);
  const [selectedAiModel, setSelectedAiModel] = useAtom(atom_selectedAiModel);
  const [claudeKey, setClaudeKey] = useAtom(atom_claudeKey);
  const [geminiKey, setGeminiKey] = useAtom(atom_geminiKey);
  const [, setIsWizardOpen] = useAtom(atom_isWizardOpen);
  const [, setVaultSetupWizardOpen] = useAtom(atom_vaultSetupWizardOpen);
  const [, setDriveVaultId] = useAtom(atom_driveVaultId);
  const [driveVaultName] = useAtom(atom_driveVaultName);
  const { authState: driveAuthState, signIn: driveSignIn, signOut: driveSignOut } = useDriveAuth();

  const [availableGeminiModels, setAvailableGeminiModels] = useAtom(atom_availableGeminiModels);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (aiProvider === "gemini" && geminiKey && availableGeminiModels.length === 0 && !fetchError) {
      const loadModels = async () => {
        setIsFetchingModels(true);
        setFetchError(null);
        try {
          const models = await fetchGeminiModels(geminiKey);
          setAvailableGeminiModels(models);
        } catch (error: any) {
          console.error("Failed to fetch models", error);
          setFetchError(error.message || "Failed to load models");
        } finally {
          setIsFetchingModels(false);
        }
      };
      loadModels();
    }
  }, [aiProvider, geminiKey, availableGeminiModels.length, setAvailableGeminiModels, fetchError]);

  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const handleTestConnection = async () => {
    const key = aiProvider === "claude" ? claudeKey : geminiKey;
    if (!key) {
      showErrorToast(`Please enter your ${aiProvider === "claude" ? "Claude" : "Gemini"} API key first.`);
      return;
    }

    setIsTestingConnection(true);
    try {
      const result = await testAIConnection(aiProvider, key);
      if (result.success) {
        showSuccessToast(`Connection to ${aiProvider === "claude" ? "Claude" : "Gemini"} successful!`);
      } else {
        showErrorToast(`Failed to connect: ${result.error}`);
      }
    } catch (error: any) {
      showErrorToast(`An error occurred: ${error.message || "Unknown error"}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const moveTab = (index: number, direction: "up" | "down") => {
    const newOrder = [...sidebarTabOrder];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setSidebarTabOrder(newOrder);
  };

  const sizes = [
    { label: "Compact", value: "14px" },
    { label: "Standard", value: "16px" },
    { label: "Large", value: "18px" },
    { label: "XL", value: "22px" },
  ];

  const widthOptions = [
    { label: "Standard", value: "standard" },
    { label: "Narrow", value: "narrow" },
  ];

  const fonts = [
    { label: "System Mono", value: MONO_FONT_STACK },
    { label: "JetBrains Mono", value: "var(--font-jetbrains), ui-monospace, monospace" },
    { label: "Fira Code", value: "var(--font-fira), ui-monospace, monospace" },
    { label: "IBM Plex Mono", value: "var(--font-ibm), ui-monospace, monospace" },
    { label: "Journal (Serif)", value: "Georgia, ui-serif, serif" },
  ];

  // Values never go below the editor's known-good defaults (1.8 / normal). Tighter
  // line-height or negative letter-spacing makes the transparent textarea diverge from
  // the highlighted <pre> overlay in react-simple-code-editor, drifting the caret off the
  // text — so we only offer the default-or-looser direction, which stays aligned.
  const lineHeights = [
    { label: "Normal", value: "1.8" },
    { label: "Relaxed", value: "2.0" },
    { label: "Loose", value: "2.3" },
  ];

  const letterSpacings = [
    { label: "Normal", value: "normal" },
    { label: "Wide", value: "0.04em" },
  ];

  const startTour = () => {
    setIsWizardOpen(true);
    router.push("/editor");
  };

  const sections = [
    {
      id: "typography",
      label: "Typography",
      icon: HiOutlineDocumentText,
      content: (
        <>
          <SettingGroup title="Size & Spacing">
            <SettingItem
              label="Text Size"
              layout="stack"
              control={
                <SegmentedControl options={sizes} value={fontSize} onChange={setFontSize} />
              }
            />
            <SettingItem
              label="Line Height"
              description="Vertical spacing between lines."
              layout="stack"
              control={
                <SegmentedControl options={lineHeights} value={lineHeight} onChange={setLineHeight} />
              }
            />
            <SettingItem
              label="Letter Spacing"
              description="Horizontal spacing between glyphs."
              layout="stack"
              control={
                <SegmentedControl options={letterSpacings} value={letterSpacing} onChange={setLetterSpacing} />
              }
            />
          </SettingGroup>
          <SettingGroup title="Typeface">
            {fonts.map((f) => {
              const isActive = fontFamily === f.value;
              return (
                <button
                  key={f.label}
                  type="button"
                  onClick={() => setFontFamily(f.value)}
                  className="w-full flex items-center justify-between gap-4 py-3.5 border-b border-neutral-100 dark:border-neutral-800/40 last:border-0 focus:outline-none"
                >
                  <div className="flex flex-col items-start gap-1 min-w-0">
                    <span className={`text-ui-subhead font-medium leading-none ${isActive ? "text-blue-600 dark:text-blue-400" : "text-ink-light dark:text-ink-dark"}`}>
                      {f.label}
                    </span>
                    <span style={{ fontFamily: f.value }} className="text-ui-footnote text-neutral-400 dark:text-neutral-500">
                      The quick brown fox 0123
                    </span>
                  </div>
                  {isActive && <HiCheck size={15} className="shrink-0 text-blue-600 dark:text-blue-400" />}
                </button>
              );
            })}
          </SettingGroup>
        </>
      ),
    },
    {
      id: "editor",
      label: "Editor",
      icon: HiOutlinePencilAlt,
      content: (
        <>
          <SettingGroup title="Save">
            <SettingItem
              label="Autosave Mode"
              description="When to persist changes."
              control={
                <SelectControl value={autosaveMode} onChange={(v) => setAutosaveMode(v as any)}>
                  <option value="afterDelay">After Delay</option>
                  <option value="onFocusChange">On Focus Change</option>
                  <option value="manual">Manual Only</option>
                </SelectControl>
              }
            />
            {autosaveMode === "afterDelay" && (
              <SettingItem
                label="Autosave Delay"
                description="Wait time after typing."
                control={
                  <SelectControl value={autosaveDelay} onChange={(v) => setAutosaveDelay(Number(v))}>
                    <option value={500}>0.5s</option>
                    <option value={1000}>1s</option>
                    <option value={2000}>2s</option>
                    <option value={3000}>3s</option>
                    <option value={5000}>5s</option>
                    <option value={10000}>10s</option>
                  </SelectControl>
                }
              />
            )}
            <SettingItem
              label="Auto-inject Frontmatter"
              description="On manual save, prepend id / title / type / tags to files with no frontmatter."
              control={<Toggle active={autoInjectFrontmatter} onChange={setAutoInjectFrontmatter} />}
            />
          </SettingGroup>
          <SettingGroup title="Display">
            <SettingItem
              label="Word Wrap"
              description="Wrap long lines to fit viewport."
              control={<Toggle active={wordWrap} onChange={setWordWrap} />}
            />
            <SettingItem
              label="Zen Mode"
              description="Focus on the active line."
              control={<Toggle active={isZenModeActive} onChange={setIsZenModeActive} />}
            />
            <SettingItem
              label="Editor Width"
              description="Maximum horizontal text span."
              layout="stack"
              control={
                <SegmentedControl
                  options={widthOptions}
                  value={editorWidth}
                  onChange={(v) => setEditorWidth(v as any)}
                />
              }
            />
          </SettingGroup>
          <SettingGroup title="Format">
            <SettingItem
              label="Preferred Currency"
              description="Used for budget calculations."
              control={
                <SelectControl value={currencyCode} onChange={setCurrencyCode}>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="CAD">CAD (C$)</option>
                  <option value="AUD">AUD (A$)</option>
                  <option value="RON">RON (lei)</option>
                </SelectControl>
              }
            />
          </SettingGroup>
        </>
      ),
    },
    {
      id: "interface",
      label: "Interface",
      icon: HiOutlineColorSwatch,
      content: (
        <>
          <SettingGroup title="Appearance">
            <SettingItem
              label="Dark Theme"
              description="Use dark application colors."
              control={
                <Toggle
                  active={theme === "dark"}
                  onChange={(active) => setTheme(active ? "dark" : "light")}
                />
              }
            />
            <SettingItem
              label="Status Bar"
              description="Show word and character counts."
              control={<Toggle active={showStats} onChange={setShowStats} />}
            />
          </SettingGroup>
          <SettingGroup title="Navigation">
            <SettingItem
              label="Sidebar Tab Order"
              description="Arrange the tabs in your vault sidebar."
              layout="stack"
              control={
                <div className="flex flex-col gap-1.5">
                  {sidebarTabOrder.map((tab, idx) => (
                    <div
                      key={tab}
                      className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/60 px-3.5 py-2.5 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60"
                    >
                      <span className="text-ui-subhead font-medium capitalize text-ink-light dark:text-ink-dark">
                        {tab}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="icon"
                          className="w-7 h-7"
                          disabled={idx === 0}
                          onClick={() => moveTab(idx, "up")}
                        >
                          <HiChevronUp size={14} />
                        </Button>
                        <Button
                          variant="icon"
                          className="w-7 h-7"
                          disabled={idx === sidebarTabOrder.length - 1}
                          onClick={() => moveTab(idx, "down")}
                        >
                          <HiChevronDown size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              }
            />
          </SettingGroup>
        </>
      ),
    },
    {
      id: "ai",
      label: "AI Features",
      icon: HiOutlineLightningBolt,
      content: (
        <>
          <SettingGroup title="Provider Config">
            <SettingItem
              label="AI Provider"
              description="Choose the model used for AI features."
              control={
                <SelectControl
                  value={aiProvider}
                  onChange={(v) => {
                    const p = v as any;
                    setAiProvider(p);
                    // Reset selected model to appropriate default for provider
                    if (p === "claude") setSelectedAiModel("sonnet-4-6");
                    else setSelectedAiModel("gemini-3.5-flash");
                  }}
                >
                  <option value="claude">Claude (Anthropic)</option>
                  <option value="gemini">Gemini (Google)</option>
                </SelectControl>
              }
            />
            {aiProvider === "claude" && (
              <SettingItem
                label="Model Tier"
                description="Haiku is fast, Opus is most powerful."
                control={
                  <SelectControl
                    value={selectedAiModel}
                    onChange={(v) => setSelectedAiModel(v as any)}
                  >
                    <option value="sonnet-4-6">Claude 4.6 Sonnet</option>
                    <option value="haiku-4-5">Claude 4.5 Haiku</option>
                    <option value="opus-4-8">Claude 4.8 Opus</option>
                  </SelectControl>
                }
              />
            )}
            {aiProvider === "gemini" && (
              <SettingItem
                label="Model Tier"
                description={
                  isFetchingModels 
                    ? "Fetching available models..." 
                    : fetchError 
                      ? `Error: ${fetchError}` 
                      : "Choose from models available to your API key."
                }
                control={
                  <div className="flex items-center gap-2">
                    <SelectControl
                      value={selectedAiModel}
                      onChange={(v) => setSelectedAiModel(v as any)}
                      disabled={isFetchingModels}
                    >
                      {availableGeminiModels.length > 0 ? (
                        availableGeminiModels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                          <option value="gemini-3.1-pro">Gemini 3.1 Pro (Preview)</option>
                          <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite</option>
                        </>
                      )}
                    </SelectControl>
                    <button
                      onClick={() => {
                        setAvailableGeminiModels([]);
                        setFetchError(null);
                      }}
                      className="p-1.5 text-zinc-400 hover:text-blue-500 transition-colors"
                      title="Refresh models"
                    >
                      <HiOutlineRefresh size={18} className={isFetchingModels ? "animate-spin" : ""} />
                    </button>
                  </div>
                }
              />
            )}
            {aiProvider === "claude" && (
              <SettingItem
                label="Claude API Key"
                description="Your Anthropic API key."
                layout="stack"
                control={
                  <Input
                    name="claudeKey"
                    value={claudeKey}
                    type="password"
                    placeholder="sk-ant-..."
                    handleChange={(e) => setClaudeKey(e.target.value.trim())}
                  />
                }
              />
            )}
            {aiProvider === "gemini" && (
              <SettingItem
                label="Gemini API Key"
                description="Your Google AI Studio API key."
                layout="stack"
                control={
                  <Input
                    name="geminiKey"
                    value={geminiKey}
                    type="password"
                    placeholder="AIza..."
                    handleChange={(e) => setGeminiKey(e.target.value.trim())}
                  />
                }
              />
            )}
            <div className="pt-2">
              <Button
                variant="secondary"
                disabled={isTestingConnection}
                onClick={handleTestConnection}
                className="w-full flex items-center justify-center gap-2 h-11"
              >
                {isTestingConnection ? (
                  <>
                    <HiOutlineRefresh className="animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test Connection"
                )}
              </Button>
            </div>
          </SettingGroup>
          <div className="mt-4 px-1">
            <p className="text-ui-caption text-zinc-400 dark:text-zinc-500 italic">
              Note: Your API keys are stored locally in your browser and never sent to HermesMarkdown servers.
            </p>
          </div>
        </>
      ),
    },
    {
      id: "integrations",
      label: "Integrations",
      icon: HiOutlineCloud,
      content: (
        <>
          <SettingGroup title="Google Drive">
            {driveAuthState === "authenticated" ? (
              <>
                <SettingItem
                  label="Connected Vault"
                  description={driveVaultName ? `Syncing with "${driveVaultName}"` : "Drive vault is active."}
                  control={
                    <Button
                      variant="secondary"
                      onClick={() => {
                        driveSignOut();
                        setDriveVaultId(null);
                      }}
                      className="h-8 px-4 text-ui-footnote font-medium"
                    >
                      Disconnect
                    </Button>
                  }
                />
              </>
            ) : driveAuthState === "expired" ? (
              <SettingItem
                label="Session Expired"
                description="Your Drive session expired. Reconnect to continue syncing."
                control={
                  <Button
                    variant="primary"
                    onClick={driveSignIn}
                    className="h-8 px-4 text-ui-footnote font-medium"
                  >
                    Reconnect
                  </Button>
                }
              />
            ) : (
              <SettingItem
                label="Connect Google Drive"
                description="Use a Google Drive folder as your vault. Files are saved directly to your Drive."
                control={
                  <Button
                    variant="primary"
                    onClick={driveSignIn}
                    className="h-8 px-4 text-ui-footnote font-medium"
                  >
                    Connect
                  </Button>
                }
              />
            )}
          </SettingGroup>
        </>
      ),
    },
    {
      id: "guide",
      label: "Guide",
      icon: HiOutlineAcademicCap,
      content: (
        <>
          <SettingGroup title="Onboarding">
            <SettingItem
              label="Welcome Tour"
              description="Replay the introduction wizard."
              control={
                <Button
                  variant="secondary"
                  onClick={startTour}
                  className="h-8 px-4 text-ui-footnote font-medium"
                >
                  Start
                </Button>
              }
            />
          </SettingGroup>
          <SettingGroup title="Agent Skills">
            <SettingItem
              label="Install / Update Skills"
              description="Manually check for and install agent skills in the active vault."
              control={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setVaultSetupWizardOpen("vault-root");
                    router.push("/editor"); // Take them back to editor to see the prompt
                  }}
                  className="h-8 px-4 text-ui-footnote font-medium"
                >
                  Install
                </Button>
              }
            />
          </SettingGroup>
        </>
      ),
    },
  ];

  const [activeSection, setActiveSection] = useState(sections[0].id);
  const active = sections.find((s) => s.id === activeSection) ?? sections[0];

  return (
    <div className="fixed inset-0 flex flex-col lg:flex-row font-sans overflow-hidden overscroll-none bg-zinc-50 dark:bg-zinc-950 text-ink-light dark:text-ink-dark selection:bg-pastel-blue/30">
      {/* Sidebar */}
      <aside className="shrink-0 lg:w-60 flex flex-col border-b lg:border-b-0 lg:border-r border-zinc-200/70 dark:border-zinc-900 bg-white dark:bg-zinc-950">
        <div className="px-5 pt-6 pb-4">
          <button
            onClick={() => router.push("/editor")}
            title="Back to editor"
            className="inline-flex items-center gap-1.5 text-ui-footnote font-medium text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors mb-5 group focus:outline-none"
          >
            <HiOutlineArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
            Editor
          </button>
          <h1 className="text-ui-title-3 font-bold tracking-tight">Settings</h1>
        </div>

        <nav className="flex lg:flex-col gap-0.5 px-3 pb-4 overflow-x-auto lg:overflow-visible">
          {sections.map((s) => {
            const Icon = s.icon;
            const isActive = s.id === activeSection;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-2.5 shrink-0 px-3 py-2.5 rounded-xl text-ui-subhead font-medium transition-all focus:outline-none ${
                  isActive
                    ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                }`}
              >
                <Icon size={16} className="shrink-0" />
                {s.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-zinc-50/80 dark:bg-[#0f0f10]">
        <div className="max-w-[560px] mx-auto px-5 sm:px-8 py-8">
          <h2 className="text-ui-title-2 font-bold tracking-tight mb-6">{active.label}</h2>
          {active.content}
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;

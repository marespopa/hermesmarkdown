"use client";

import React, { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { useRouter } from "next/navigation";
import {
  atom_wordWrap,
  atom_editorFontFamily,
  atom_theme,
  type Theme,
  atom_isWizardOpen,
  atom_autosaveMode,
  atom_autosaveDelay,
  atom_aiProvider,
  atom_selectedAiModel,
  atom_claudeKey,
  atom_geminiKey,
  atom_vimMode,
  atom_frontmatterCollapsedByDefault,
} from "@/app/atoms/atoms";
import { atom_availableGeminiModels, atom_availableClaudeModels, atom_lineNumbers, atom_showCommandPaletteFab, atom_showHiddenFiles } from "@/app/atoms/ui-atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { testAIConnection, fetchGeminiModels, fetchClaudeModels } from "@/app/services/ai";
import {
  HiOutlineArrowLeft,
  HiOutlinePencilAlt,
  HiOutlineAcademicCap,
  HiOutlineLightningBolt,
  HiOutlineRefresh,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineDesktopComputer,
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
import { FONTS } from "./font-options";
import FontPicker from "./components/FontPicker";

const SettingsPage = () => {
  const router = useRouter();

  const [theme, setTheme] = useAtom(atom_theme);
  const [wordWrap, setWordWrap] = useAtom(atom_wordWrap);
  const [lineNumbers, setLineNumbers] = useAtom(atom_lineNumbers);
  const [vimMode, setVimMode] = useAtom(atom_vimMode);
  const [frontmatterCollapsedByDefault, setFrontmatterCollapsedByDefault] = useAtom(
    atom_frontmatterCollapsedByDefault,
  );
  const [autosaveMode, setAutosaveMode] = useAtom(atom_autosaveMode);
  const [autosaveDelay, setAutosaveDelay] = useAtom(atom_autosaveDelay);
  const [showHiddenFiles, setShowHiddenFiles] = useAtom(atom_showHiddenFiles);
  const [showCommandPaletteFab, setShowCommandPaletteFab] = useAtom(atom_showCommandPaletteFab);
  const [editorFontFamily, setEditorFontFamily] = useAtom(atom_editorFontFamily);
  const { scanVault, indexVaultTags, vaultHandle: fsVaultHandle } = useFileSystem();

  const handleShowHiddenFilesChange = (next: boolean) => {
    setShowHiddenFiles(next);
    // Rescan immediately — this page is a separate route from the editor, so
    // the tree-owning hook isn't mounted here to react to the atom change itself.
    if (!fsVaultHandle) return;
    scanVault(fsVaultHandle as any, next);
    indexVaultTags(fsVaultHandle as any, next);
  };
  const [aiProvider, setAiProvider] = useAtom(atom_aiProvider);
  const [selectedAiModel, setSelectedAiModel] = useAtom(atom_selectedAiModel);
  const [claudeKey, setClaudeKey] = useAtom(atom_claudeKey);
  const [geminiKey, setGeminiKey] = useAtom(atom_geminiKey);
  const [, setIsWizardOpen] = useAtom(atom_isWizardOpen);

  const [availableGeminiModels, setAvailableGeminiModels] = useAtom(atom_availableGeminiModels);
  const [availableClaudeModels, setAvailableClaudeModels] = useAtom(atom_availableClaudeModels);
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
          setFetchError(error.message || "Failed to load models");
        } finally {
          setIsFetchingModels(false);
        }
      };
      loadModels();
    }
  }, [aiProvider, geminiKey, availableGeminiModels.length, setAvailableGeminiModels, fetchError]);

  useEffect(() => {
    if (aiProvider === "claude" && claudeKey && availableClaudeModels.length === 0 && !fetchError) {
      const loadModels = async () => {
        setIsFetchingModels(true);
        setFetchError(null);
        try {
          const models = await fetchClaudeModels(claudeKey);
          setAvailableClaudeModels(models);
        } catch (error: any) {
          setFetchError(error.message || "Failed to load models");
        } finally {
          setIsFetchingModels(false);
        }
      };
      loadModels();
    }
  }, [aiProvider, claudeKey, availableClaudeModels.length, setAvailableClaudeModels, fetchError]);

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

  const removeAiKey = () => {
    if (aiProvider === "claude") {
      setClaudeKey("");
      setAvailableClaudeModels([]);
    } else {
      setGeminiKey("");
      setAvailableGeminiModels([]);
    }
    setFetchError(null);
  };

  const THEME_OPTIONS: { label: string; value: Theme; Icon: React.ComponentType<{ size?: number }> }[] = [
    { label: "Light", value: "light", Icon: HiOutlineSun },
    { label: "Dark", value: "dark", Icon: HiOutlineMoon },
    { label: "System", value: "system", Icon: HiOutlineDesktopComputer },
  ];

  const startTour = () => {
    setIsWizardOpen(true);
    router.push("/editor");
  };

  const sections = [
    {
      id: "editor",
      label: "Editor",
      icon: HiOutlinePencilAlt,
      content: (
        <>
          <SettingGroup title="Appearance">
            <SettingItem
              label="Theme"
              description="System follows your OS's light/dark setting and switches automatically when it changes."
              control={
                <SegmentedControl
                  options={THEME_OPTIONS}
                  value={theme}
                  onChange={setTheme}
                />
              }
            />
            <SettingItem
              label="Word Wrap"
              description="Wrap long lines to fit the viewport width."
              control={<Toggle variant="soft" active={wordWrap} onChange={setWordWrap} />}
            />
            <SettingItem
              label="Line Numbers"
              description="Show line numbers beside the source editor."
              control={<Toggle variant="soft" active={lineNumbers} onChange={setLineNumbers} />}
            />
            <SettingItem
              label="Vim Mode"
              description="Use Vim motions and editing modes in the source editor."
              control={<Toggle variant="soft" active={vimMode} onChange={setVimMode} />}
            />
            <SettingItem
              label="Collapse Frontmatter"
              description="Start with the YAML frontmatter folded when opening files."
              control={
                <Toggle
                  variant="soft"
                  active={frontmatterCollapsedByDefault}
                  onChange={setFrontmatterCollapsedByDefault}
                  label="Collapse frontmatter by default"
                />
              }
            />
            <SettingItem
              label="Command Palette Button"
              description="Show a floating button that opens the Command Palette. Keyboard shortcuts remain available when hidden."
              control={<Toggle variant="soft" active={showCommandPaletteFab} onChange={setShowCommandPaletteFab} />}
            />
            <SettingItem
              label="Show Hidden Files"
              description="Reveal .hermes/* and _-prefixed skill files in the sidebar tree and search, so anything the app writes into your vault is always visible and editable. On by default; turn off to declutter everyday browsing."
              control={<Toggle variant="soft" active={showHiddenFiles} onChange={handleShowHiddenFilesChange} />}
            />
          </SettingGroup>
          <SettingGroup title="Typography">
            <SettingItem
              label="Font"
              description="Choose a paper-like typeface for the Markdown editor. Fonts are self-hosted and keep a system fallback."
              layout="stack"
              control={<FontPicker fonts={FONTS} value={editorFontFamily} onChange={setEditorFontFamily} />}
            />
          </SettingGroup>
          <SettingGroup title="Autosave">
            <SettingItem
              label="Autosave Mode"
              description="When unsaved changes are written to disk."
              control={
                <SelectControl value={autosaveMode} onChange={(v) => setAutosaveMode(v as any)}>
                  <option value="afterDelay">After Delay</option>
                  <option value="onFocusChange">On Focus Change</option>
                  <option value="manual">Manual Only (⌘S)</option>
                </SelectControl>
              }
            />
            {autosaveMode === "afterDelay" && (
              <SettingItem
                label="Delay"
                description="Idle time after the last keystroke before saving."
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
                    if (p === "claude") setSelectedAiModel("sonnet-5");
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
                      {availableClaudeModels.length > 0 ? (
                        availableClaudeModels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="sonnet-5">Claude Sonnet 5</option>
                          <option value="haiku-4-5">Claude 4.5 Haiku</option>
                          <option value="opus-4-8">Claude 4.8 Opus</option>
                        </>
                      )}
                    </SelectControl>
                    <button
                      onClick={() => {
                        setAvailableClaudeModels([]);
                        setFetchError(null);
                      }}
                      className="p-1.5 text-stone hover:text-sage transition-colors"
                      title="Refresh models"
                    >
                      <HiOutlineRefresh size={18} className={isFetchingModels ? "animate-spin" : ""} />
                    </button>
                  </div>
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
                      className="p-1.5 text-stone hover:text-sage transition-colors"
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
                description="Your Anthropic API key. Remove it to disable AI features for this provider."
                layout="stack"
                control={
                  <div className="flex flex-col gap-2">
                    <Input
                      name="claudeKey"
                      value={claudeKey}
                      type="password"
                      placeholder="sk-ant-..."
                      handleChange={(e) => setClaudeKey(e.target.value.trim())}
                    />
                    <Button
                      variant="secondary"
                      onClick={removeAiKey}
                      disabled={!claudeKey}
                      className="h-8 self-start px-3 text-ui-footnote text-red-500 hover:bg-red-500/10 disabled:text-fg-faint"
                    >
                      Remove AI key
                    </Button>
                  </div>
                }
              />
            )}
            {aiProvider === "gemini" && (
              <SettingItem
                label="Gemini API Key"
                description="Your Google AI Studio API key. Remove it to disable AI features for this provider."
                layout="stack"
                control={
                  <div className="flex flex-col gap-2">
                    <Input
                      name="geminiKey"
                      value={geminiKey}
                      type="password"
                      placeholder="AIza..."
                      handleChange={(e) => setGeminiKey(e.target.value.trim())}
                    />
                    <Button
                      variant="secondary"
                      onClick={removeAiKey}
                      disabled={!geminiKey}
                      className="h-8 self-start px-3 text-ui-footnote text-red-500 hover:bg-red-500/10 disabled:text-fg-faint"
                    >
                      Remove AI key
                    </Button>
                  </div>
                }
              />
            )}
            <div className="pt-2 pb-4">
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
              description="Walk through the intro screens again to rediscover features."
              control={
                <Button
                  variant="secondary"
                  onClick={startTour}
                  className="h-8 px-4 text-ui-footnote font-medium"
                >
                  Start Tour
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
    <div className="fixed inset-0 flex flex-col overflow-hidden overscroll-none bg-paper-pale font-sans text-ink-light selection:bg-sage/10 dark:bg-paper-dark dark:text-ink-dark lg:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-edge-subtle bg-chrome/85 backdrop-blur-2xl lg:w-72 lg:border-b-0 lg:border-r">
        <div className="border-b border-edge-subtle px-4 pb-3 pt-4">
          <button
            onClick={() => router.push("/editor")}
            title="Back to editor"
            className="group mb-3 inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-ui-footnote font-medium text-ink-muted transition-colors hover:bg-paper-light/70 hover:text-ink-light focus:outline-none dark:text-stone dark:hover:bg-paper-dark-surface dark:hover:text-ink-dark"
          >
            <HiOutlineArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
            Editor
          </button>
          <h1 className="text-ui-title-3 font-semibold tracking-tight">Settings</h1>
        </div>

        <nav aria-label="Settings sections" className="flex gap-0.5 overflow-x-auto px-3 py-3 lg:flex-col lg:overflow-visible">
          {sections.map((s) => {
            const Icon = s.icon;
            const isActive = s.id === activeSection;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex h-8 shrink-0 items-center gap-2 px-2.5 rounded-lg text-ui-subhead font-medium transition-colors focus:outline-none ${
                  isActive
                    ? "bg-paper-light/80 text-ink-light shadow-sm dark:bg-white/10 dark:text-ink-dark"
                    : "text-ink-muted hover:bg-paper-light/70 hover:text-ink-light dark:text-stone dark:hover:bg-paper-dark-surface dark:hover:text-ink-dark"
                }`}
              >
                <Icon size={16} className="shrink-0" />
                {s.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="min-h-0 flex-1 overflow-y-auto bg-paper-pale custom-scrollbar dark:bg-paper-dark">
        <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-10 lg:px-12 xl:px-16">
          <h2 className="mb-5 text-ui-title-2 font-semibold tracking-tight">{active.label}</h2>
          {active.content}
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;

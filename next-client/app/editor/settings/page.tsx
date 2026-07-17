"use client";

import React, { useState, useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import { useRouter } from "next/navigation";
import {
  atom_wordWrap,
  atom_fontSize,
  atom_fontFamily,
  atom_lineHeight,
  atom_letterSpacing,
  atom_theme,
  atom_isWizardOpen,
  atom_autosaveMode,
  atom_autosaveDelay,
  atom_editorWidth,
  atom_frontmatterDefaultMode,
  atom_aiProvider,
  atom_selectedAiModel,
  atom_claudeKey,
  atom_geminiKey,
} from "@/app/atoms/atoms";
import { atom_availableGeminiModels, atom_availableClaudeModels, atom_showHiddenFiles, atom_tabsBarVisibleByDefault } from "@/app/atoms/ui-atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { testAIConnection, fetchGeminiModels, fetchClaudeModels } from "@/app/services/ai";
import {
  HiOutlineArrowLeft,
  HiOutlinePencilAlt,
  HiOutlineAcademicCap,
  HiOutlineLightningBolt,
  HiCheck,
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
import { FONT_SIZES, LINE_HEIGHTS, LETTER_SPACINGS, FONTS } from "./font-options";

const SettingsPage = () => {
  const router = useRouter();

  const [fontSize, setFontSize] = useAtom(atom_fontSize);
  const [fontFamily, setFontFamily] = useAtom(atom_fontFamily);
  const [lineHeight, setLineHeight] = useAtom(atom_lineHeight);
  const [letterSpacing, setLetterSpacing] = useAtom(atom_letterSpacing);
  const [theme, setTheme] = useAtom(atom_theme);
  const [wordWrap, setWordWrap] = useAtom(atom_wordWrap);
  const [autosaveMode, setAutosaveMode] = useAtom(atom_autosaveMode);
  const [autosaveDelay, setAutosaveDelay] = useAtom(atom_autosaveDelay);
  const [editorWidth, setEditorWidth] = useAtom(atom_editorWidth);
  const [frontmatterDefaultMode, setFrontmatterDefaultMode] = useAtom(atom_frontmatterDefaultMode);
  const [showHiddenFiles, setShowHiddenFiles] = useAtom(atom_showHiddenFiles);
  const [tabsBarVisibleByDefault, setTabsBarVisibleByDefault] = useAtom(atom_tabsBarVisibleByDefault);
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
          console.error("Failed to fetch models", error);
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
          console.error("Failed to fetch models", error);
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

  const widthOptions = [
    { label: "Standard", value: "standard" },
    { label: "Narrow", value: "narrow" },
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
              label="Dark Theme"
              description="Use dark application colors."
              control={
                <Toggle
                  variant="soft"
                  active={theme === "dark"}
                  onChange={(active) => setTheme(active ? "dark" : "light")}
                />
              }
            />
            <SettingItem
              label="Word Wrap"
              description="Wrap long lines to fit the viewport width."
              control={<Toggle variant="soft" active={wordWrap} onChange={setWordWrap} />}
            />
            <SettingItem
              label="Show Tabs Bar"
              description="Show the open-file tabs strip by default. Off by default; each pane can still be toggled open with the chevron above it."
              control={<Toggle variant="soft" active={tabsBarVisibleByDefault} onChange={setTabsBarVisibleByDefault} />}
            />
            <SettingItem
              label="Editor Width"
              description="Maximum line width. Narrow gives a tighter reading column."
              layout="stack"
              control={
                <SegmentedControl
                  options={widthOptions}
                  value={editorWidth}
                  onChange={(v) => setEditorWidth(v as any)}
                />
              }
            />
            <SettingItem
              label="Show Hidden Files"
              description="Reveal .hermes/* and _-prefixed skill files in the sidebar tree and search, so anything the app writes into your vault is always visible and editable. On by default; turn off to declutter everyday browsing."
              control={<Toggle variant="soft" active={showHiddenFiles} onChange={handleShowHiddenFilesChange} />}
            />
          </SettingGroup>
          <SettingGroup title="Typography">
            <SettingItem
              label="Text Size"
              layout="stack"
              control={
                <SegmentedControl options={FONT_SIZES} value={fontSize} onChange={setFontSize} />
              }
            />
            <SettingItem
              label="Line Height"
              description="Vertical spacing between lines."
              layout="stack"
              control={
                <SegmentedControl options={LINE_HEIGHTS} value={lineHeight} onChange={setLineHeight} />
              }
            />
            <SettingItem
              label="Letter Spacing"
              description="Horizontal spacing between glyphs."
              layout="stack"
              control={
                <SegmentedControl options={LETTER_SPACINGS} value={letterSpacing} onChange={setLetterSpacing} />
              }
            />
            <SettingItem
              label="Font"
              description="Used in the editor's writing pane."
              layout="stack"
              control={
                <div className="rounded-xl border border-neutral-100 dark:border-neutral-800/40 px-3 -mx-1">
                  {FONTS.map((f) => {
                    const isActive = fontFamily === f.value;
                    return (
                      <button
                        key={f.label}
                        type="button"
                        onClick={() => setFontFamily(f.value)}
                        className="w-full flex items-center justify-between gap-4 py-3 border-b border-neutral-100 dark:border-neutral-800/40 last:border-0 focus:outline-none"
                      >
                        <div className="flex flex-col items-start gap-1 min-w-0">
                          <span className={`text-ui-subhead font-medium leading-none ${isActive ? "text-sage dark:text-sage" : "text-ink-light dark:text-ink-dark"}`}>
                            {f.label}
                          </span>
                          <span style={{ fontFamily: f.value }} className="text-ui-footnote text-neutral-400 dark:text-neutral-500">
                            The quick brown fox 0123
                          </span>
                        </div>
                        {isActive && <HiCheck size={15} className="shrink-0 text-sage dark:text-sage" />}
                      </button>
                    );
                  })}
                </div>
              }
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
          <SettingGroup title="Frontmatter">
            <SettingItem
              label="Default View"
              description="Whether to open the frontmatter panel in structured Fields view or raw YAML by default."
              control={
                <SegmentedControl
                  options={[
                    { label: "Fields", value: "fields" },
                    { label: "Raw YAML", value: "raw" },
                  ]}
                  value={frontmatterDefaultMode}
                  onChange={setFrontmatterDefaultMode}
                />
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
    <div className="fixed inset-0 flex flex-col lg:flex-row font-sans overflow-hidden overscroll-none bg-paper-pale dark:bg-paper-dark text-ink-light dark:text-ink-dark selection:bg-sage/10">
      {/* Sidebar */}
      <aside className="shrink-0 lg:w-60 flex flex-col border-b lg:border-b-0 lg:border-r border-beige/70 dark:border-paper-dark bg-paper-pale dark:bg-paper-dark">
        <div className="px-5 pt-6 pb-4">
          <button
            onClick={() => router.push("/editor")}
            title="Back to editor"
            className="inline-flex items-center gap-1.5 text-ui-footnote font-medium text-stone hover:text-ink-light dark:hover:text-ink-dark transition-colors mb-5 group focus:outline-none"
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
                    ? "bg-sage/10 dark:bg-sage/10 text-sage dark:text-sage"
                    : "text-ink-muted hover:text-ink-light dark:hover:text-ink-dark hover:bg-paper-softgray dark:hover:bg-paper-dark"
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
      <main className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-paper-pale dark:bg-paper-dark">
        <div className="px-5 sm:px-8 py-8">
          <h2 className="text-ui-title-2 font-bold tracking-tight mb-6">{active.label}</h2>
          {active.content}
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;

"use client";

import React, { useState } from "react";
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
  MONO_FONT_STACK,
} from "@/app/atoms/atoms";
import {
  HiOutlineArrowLeft,
  HiOutlineDocumentText,
  HiOutlinePencilAlt,
  HiOutlineColorSwatch,
  HiOutlineAcademicCap,
  HiCheck,
  HiChevronUp,
  HiChevronDown,
} from "react-icons/hi";
import Button from "@/app/components/Button";
import Toggle from "@/app/components/Toggle";
import { SettingItem } from "./components/SettingControls";

const selectClass =
  "bg-zinc-200/50 dark:bg-zinc-800 text-ui-caption font-semibold rounded-xl px-3 py-1.5 outline-none border border-transparent focus:border-blue-500/50 cursor-pointer appearance-none text-center min-w-[130px] transition-all";

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
  const [, setIsWizardOpen] = useAtom(atom_isWizardOpen);

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
          <SettingItem
            label="Text Size"
            control={
              <div className="flex bg-zinc-200/50 dark:bg-zinc-800 p-1 rounded-xl">
                {sizes.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => setFontSize(s.value)}
                    className={`px-3 py-1.5 text-ui-footnote font-semibold rounded-lg transition-all ${
                      fontSize === s.value
                        ? "bg-white dark:bg-zinc-700 shadow-sm text-blue-600 dark:text-blue-400"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            }
          />
          <div className="py-3 border-b border-neutral-100 dark:border-neutral-800/30">
            <div className="flex flex-col mb-3">
              <span className="text-ui-footnote font-medium leading-none">Font</span>
              <span className="text-ui-footnote text-neutral-500 dark:text-neutral-400 mt-1.5 leading-tight">
                Monospace keeps the editor caret aligned.
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {fonts.map((f) => {
                const isActive = fontFamily === f.value;
                return (
                  <button
                    key={f.label}
                    onClick={() => setFontFamily(f.value)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl border transition-all ${
                      isActive
                        ? "border-blue-500/60 bg-blue-50 dark:bg-blue-500/10"
                        : "border-neutral-200/70 dark:border-neutral-800/70 hover:bg-neutral-100 dark:hover:bg-neutral-800/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-ui-footnote font-semibold ${
                          isActive ? "text-blue-600 dark:text-blue-400" : "text-neutral-700 dark:text-neutral-200"
                        }`}
                      >
                        {f.label}
                      </span>
                      {isActive && <HiCheck size={16} className="text-blue-600 dark:text-blue-400" />}
                    </div>
                    <span
                      style={{ fontFamily: f.value }}
                      className="block mt-1 text-ui-callout text-neutral-600 dark:text-neutral-300"
                    >
                      The quick brown fox 0123 {"{}"} =&gt;
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <SettingItem
            label="Line Height"
            description="Vertical spacing between lines."
            control={
              <div className="flex bg-zinc-200/50 dark:bg-zinc-800 p-1 rounded-xl">
                {lineHeights.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setLineHeight(opt.value)}
                    className={`px-3 py-1.5 text-ui-footnote font-semibold rounded-lg transition-all ${
                      lineHeight === opt.value
                        ? "bg-white dark:bg-zinc-700 shadow-sm text-blue-600 dark:text-blue-400"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            }
          />
          <SettingItem
            label="Letter Spacing"
            description="Horizontal spacing between glyphs."
            control={
              <div className="flex bg-zinc-200/50 dark:bg-zinc-800 p-1 rounded-xl">
                {letterSpacings.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setLetterSpacing(opt.value)}
                    className={`px-3 py-1.5 text-ui-footnote font-semibold rounded-lg transition-all ${
                      letterSpacing === opt.value
                        ? "bg-white dark:bg-zinc-700 shadow-sm text-blue-600 dark:text-blue-400"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            }
          />
        </>
      ),
    },
    {
      id: "editor",
      label: "Editor",
      icon: HiOutlinePencilAlt,
      content: (
        <>
          <SettingItem
            label="Autosave Mode"
            description="When to persist changes."
            control={
              <select
                value={autosaveMode}
                onChange={(e) => setAutosaveMode(e.target.value as any)}
                className={selectClass}
              >
                <option value="afterDelay">After Delay</option>
                <option value="onFocusChange">On Focus Change</option>
                <option value="manual">Manual Only</option>
              </select>
            }
          />
          {autosaveMode === "afterDelay" && (
            <SettingItem
              label="Autosave Delay"
              description="Wait time after typing."
              control={
                <select
                  value={autosaveDelay}
                  onChange={(e) => setAutosaveDelay(Number(e.target.value))}
                  className={selectClass}
                >
                  <option value={500}>0.5s</option>
                  <option value={1000}>1s</option>
                  <option value={2000}>2s</option>
                  <option value={3000}>3s</option>
                  <option value={5000}>5s</option>
                  <option value={10000}>10s</option>
                </select>
              }
            />
          )}
          <SettingItem
            label="Auto-inject Frontmatter"
            description="On manual save, prepend id / title / type / tags to files with no frontmatter."
            control={<Toggle active={autoInjectFrontmatter} onChange={setAutoInjectFrontmatter} />}
          />
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
            control={
              <div className="flex bg-zinc-200/50 dark:bg-zinc-800 p-1 rounded-xl">
                {widthOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setEditorWidth(opt.value as any)}
                    className={`px-3 py-1.5 text-ui-footnote font-semibold rounded-lg transition-all ${
                      editorWidth === opt.value
                        ? "bg-white dark:bg-zinc-700 shadow-sm text-blue-600 dark:text-blue-400"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            }
          />
          <SettingItem
            label="Preferred Currency"
            description="Used for budget calculations."
            control={
              <select
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value)}
                className={selectClass}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="INR">INR (₹)</option>
                <option value="CAD">CAD (C$)</option>
                <option value="AUD">AUD (A$)</option>
                <option value="RON">RON (lei)</option>
              </select>
            }
          />
        </>
      ),
    },
    {
      id: "interface",
      label: "Interface",
      icon: HiOutlineColorSwatch,
      content: (
        <>
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
          <SettingItem
            label="Sidebar Tab Order"
            description="Arrange the tabs in your vault sidebar."
            control={
              <div className="flex flex-col gap-2 min-w-[160px]">
                {sidebarTabOrder.map((tab, idx) => (
                  <div key={tab} className="flex items-center justify-between bg-zinc-200/50 dark:bg-zinc-800 p-2 rounded-xl">
                    <span className="text-ui-footnote font-semibold ml-2 capitalize">{tab}</span>
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
        </>
      ),
    },
    {
      id: "guide",
      label: "Guide",
      icon: HiOutlineAcademicCap,
      content: (
        <SettingItem
          label="Welcome Tour"
          description="Replay the introduction wizard."
          control={
            <Button
              variant="secondary"
              onClick={startTour}
              className="h-9 px-5 text-ui-footnote font-medium border-zinc-200 dark:border-zinc-800"
            >
              Start
            </Button>
          }
        />
      ),
    },
  ];

  const [activeSection, setActiveSection] = useState(sections[0].id);
  const active = sections.find((s) => s.id === activeSection) ?? sections[0];

  return (
    <div className="fixed inset-0 flex flex-col lg:flex-row bg-paper-light dark:bg-paper-dark text-ink-light dark:text-ink-dark selection:bg-pastel-blue/30 font-sans overflow-hidden overscroll-none">
      {/* Sidebar / category rail */}
      <aside className="shrink-0 lg:w-72 flex flex-col border-b lg:border-b-0 lg:border-r border-zinc-200/60 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-5 lg:px-6 pt-6 pb-4">
          <Button
            variant="icon"
            onClick={() => router.push("/editor")}
            className="w-9 h-9 shrink-0"
            title="Back to editor"
          >
            <HiOutlineArrowLeft size={20} />
          </Button>
          <div className="space-y-0.5">
            <h1 className="text-ui-title-2 font-bold tracking-tight leading-none">Settings</h1>
            <p className="text-ui-footnote text-neutral-500 dark:text-neutral-400 font-medium">
              Environment Configuration
            </p>
          </div>
        </div>

        <nav className="flex lg:flex-col gap-1 px-3 lg:px-4 pb-4 overflow-x-auto lg:overflow-x-visible custom-scrollbar">
          {sections.map((s) => {
            const Icon = s.icon;
            const isActive = s.id === activeSection;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-3 shrink-0 px-3.5 py-2.5 rounded-xl text-ui-footnote font-semibold transition-all ${
                  isActive
                    ? "bg-zinc-200/70 dark:bg-zinc-800 text-blue-600 dark:text-blue-400"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900/60"
                }`}
              >
                <Icon size={18} className="shrink-0" />
                {s.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Content panel */}
      <main className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <div className="max-w-2xl mx-auto px-5 sm:px-8 py-8">
          <h2 className="text-ui-title-3 font-bold tracking-tight mb-5 px-1">{active.label}</h2>
          <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-[20px] px-4 py-1 border border-neutral-200/50 dark:border-neutral-800/50">
            {active.content}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;

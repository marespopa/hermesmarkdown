"use client";

import React from "react";
import { useAtom } from "jotai";
import { HiOutlineColorSwatch, HiOutlinePencil, HiOutlineTemplate } from "react-icons/hi";
import {
  atom_autosaveMode,
  atom_editorFontFamily,
  atom_flowMode,
  atom_fullWidth,
  atom_lineNumbers,
  atom_renderedFontSize,
  atom_sidebarOpen,
  atom_theme,
  atom_vimMode,
  type Theme,
} from "@/app/atoms/ui-atoms";
import Toggle from "@/app/components/Toggle";
import FontPicker from "@/app/editor/settings/components/FontPicker";
import { SegmentedControl, SelectControl } from "@/app/editor/settings/components/SettingControls";
import { FONTS, TEXT_SIZES } from "@/app/editor/settings/font-options";
import WizardStep, { WizardPanel } from "./WizardStep";

// Steps 2–4 of the welcome wizard, each a group of related settings:
// Look (theme, font, text size), Layout (width, sidebar, line numbers) and
// Writing (Vim, flow mode, autosave). Every control writes its setting
// immediately.

const THEME_OPTIONS: { label: string; value: Theme }[] = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "System", value: "system" },
];

type Width = "standard" | "full";
const WIDTH_OPTIONS: { label: string; value: Width }[] = [
  { label: "Standard", value: "standard" },
  { label: "Full", value: "full" },
];

type StepProps = { onContinue: () => void };

const LABEL_CLASS = "block text-[11px] font-bold uppercase tracking-wider opacity-70";

// One setting in a grouped panel: label and hint on the left, control on
// the right. Rows are separated by the panel's dividers.
function SettingRow({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <div className="text-ui-footnote font-semibold">{label}</div>
        <div className="text-ui-caption opacity-60">{hint}</div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function ToggleRow({ label, hint, active, onChange }: { label: string; hint: string; active: boolean; onChange: (value: boolean) => void }) {
  return (
    <SettingRow label={label} hint={hint}>
      <Toggle variant="soft" active={active} onChange={onChange} label={label} />
    </SettingRow>
  );
}

export function LookStep({ onContinue }: StepProps) {
  const [theme, setTheme] = useAtom(atom_theme);
  const [editorFontFamily, setEditorFontFamily] = useAtom(atom_editorFontFamily);
  const [renderedFontSize, setRenderedFontSize] = useAtom(atom_renderedFontSize);
  return (
    <WizardStep
      icon={<HiOutlineColorSwatch size={32} />}
      title="Make it yours"
      description="Theme, typeface and text size. System follows your OS's light/dark setting."
      onContinue={onContinue}
    >
      <WizardPanel className="space-y-4 text-left">
        <div className="space-y-2">
          <span className={LABEL_CLASS}>Theme</span>
          <SegmentedControl options={THEME_OPTIONS} value={theme} onChange={setTheme} />
        </div>
        <div className="space-y-2">
          <span className={LABEL_CLASS}>Font</span>
          <div className="max-h-[28vh] overflow-y-auto">
            <FontPicker fonts={FONTS} value={editorFontFamily} onChange={setEditorFontFamily} />
          </div>
        </div>
        <div className="space-y-2">
          <label className={LABEL_CLASS}>Text size</label>
          <SelectControl value={renderedFontSize} onChange={setRenderedFontSize} ariaLabel="Text size">
            {TEXT_SIZES.map((size) => <option key={size.value} value={size.value}>{size.label}</option>)}
          </SelectControl>
        </div>
      </WizardPanel>
    </WizardStep>
  );
}

export function LayoutStep({ onContinue }: StepProps) {
  const [fullWidth, setFullWidth] = useAtom(atom_fullWidth);
  const [sidebarOpen, setSidebarOpen] = useAtom(atom_sidebarOpen);
  const [lineNumbers, setLineNumbers] = useAtom(atom_lineNumbers);
  return (
    <WizardStep
      icon={<HiOutlineTemplate size={32} />}
      title="Lay out the page"
      description="How wide the text runs and what sits around it."
      onContinue={onContinue}
    >
      <WizardPanel className="divide-y divide-edge text-left">
        <SettingRow label="Editor width" hint="Standard stops at a comfortable reading width; Full fills the window.">
          <SegmentedControl
            options={WIDTH_OPTIONS}
            value={fullWidth ? "full" : "standard"}
            onChange={(value) => setFullWidth(value === "full")}
          />
        </SettingRow>
        <ToggleRow
          label="Sidebar"
          hint="Open notes and vault files on the left. Toggle it any time with Ctrl/Cmd+Alt+S."
          active={sidebarOpen}
          onChange={setSidebarOpen}
        />
        <ToggleRow
          label="Line numbers"
          hint="Easier to navigate and point at a specific line."
          active={lineNumbers}
          onChange={setLineNumbers}
        />
      </WizardPanel>
    </WizardStep>
  );
}

export function WritingStep({ onContinue }: StepProps) {
  const [vimMode, setVimMode] = useAtom(atom_vimMode);
  const [flowMode, setFlowMode] = useAtom(atom_flowMode);
  const [autosaveMode, setAutosaveMode] = useAtom(atom_autosaveMode);
  return (
    <WizardStep
      icon={<HiOutlinePencil size={32} />}
      title="How you write"
      description="Keybindings, focus and when changes reach the disk."
      onContinue={onContinue}
    >
      <WizardPanel className="divide-y divide-edge text-left">
        <ToggleRow label="Vim mode" hint="Vim motions and editing modes." active={vimMode} onChange={setVimMode} />
        <ToggleRow
          label="Flow mode"
          hint="Fade everything but the current paragraph and keep your line centred."
          active={flowMode}
          onChange={setFlowMode}
        />
        <SettingRow label="Autosave" hint="When changes get written to disk.">
          <SelectControl value={autosaveMode} onChange={(v) => setAutosaveMode(v as typeof autosaveMode)} ariaLabel="Autosave" size="sm" fullWidth={false}>
            <option value="afterDelay">After 2s delay</option>
            <option value="onFocusChange">On focus change</option>
            <option value="manual">Manual only</option>
          </SelectControl>
        </SettingRow>
      </WizardPanel>
    </WizardStep>
  );
}

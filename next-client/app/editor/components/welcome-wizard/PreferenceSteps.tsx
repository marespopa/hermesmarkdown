"use client";

import React from "react";
import { useAtom } from "jotai";
import { HiOutlineColorSwatch, HiOutlineDesktopComputer, HiOutlineEye, HiOutlineLightningBolt, HiOutlineRefresh, HiOutlineViewList } from "react-icons/hi";
import {
  atom_autosaveMode,
  atom_editorFontFamily,
  atom_flowMode,
  atom_lineNumbers,
  atom_renderedFontSize,
  atom_theme,
  atom_vimMode,
  type Theme,
} from "@/app/atoms/ui-atoms";
import Toggle from "@/app/components/Toggle";
import FontPicker from "@/app/editor/settings/components/FontPicker";
import { SegmentedControl, SelectControl } from "@/app/editor/settings/components/SettingControls";
import { FONTS } from "@/app/editor/settings/font-options";
import WizardStep, { WizardPanel } from "./WizardStep";

// Steps 1–7 of the welcome wizard: theme, font, text size, line numbers,
// Vim mode, flow mode, and autosave. Each writes its setting immediately.

const THEME_OPTIONS: { label: string; value: Theme }[] = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "System", value: "system" },
];

type StepProps = { onContinue: () => void };

export function ThemeStep({ onContinue }: StepProps) {
  const [theme, setTheme] = useAtom(atom_theme);
  return (
    <WizardStep
      icon={<HiOutlineDesktopComputer size={32} />}
      title="Theme"
      description="System follows your OS's light/dark setting and switches automatically when it changes."
      onContinue={onContinue}
    >
      <WizardPanel>
        <SegmentedControl options={THEME_OPTIONS} value={theme} onChange={setTheme} />
      </WizardPanel>
    </WizardStep>
  );
}

export function FontStep({ onContinue }: StepProps) {
  const [editorFontFamily, setEditorFontFamily] = useAtom(atom_editorFontFamily);
  return (
    <WizardStep
      icon={<HiOutlineColorSwatch size={32} />}
      title="Make the editor feel like paper"
      description="Choose a comfortable typeface for writing Markdown."
      onContinue={onContinue}
    >
      <div className="w-full text-left">
        <div className="max-h-[40vh] overflow-y-auto">
          <FontPicker fonts={FONTS} value={editorFontFamily} onChange={setEditorFontFamily} />
        </div>
      </div>
    </WizardStep>
  );
}

export function TextSizeStep({ onContinue }: StepProps) {
  const [renderedFontSize, setRenderedFontSize] = useAtom(atom_renderedFontSize);
  return (
    <WizardStep
      icon={<HiOutlineColorSwatch size={32} />}
      title="Choose your text size"
      description="Set a comfortable reading size for your notes."
      onContinue={onContinue}
    >
      <WizardPanel className="text-left">
        <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider opacity-70">
          Text size
        </label>
        <SelectControl value={renderedFontSize} onChange={setRenderedFontSize} ariaLabel="Text size">
          <option value="14px">Small</option>
          <option value="16px">Medium</option>
          <option value="18px">Large</option>
          <option value="20px">Extra large</option>
          <option value="22px">Largest</option>
        </SelectControl>
      </WizardPanel>
    </WizardStep>
  );
}

function ToggleRow({ label, active, onChange }: { label: string; active: boolean; onChange: (value: boolean) => void }) {
  return (
    <WizardPanel className="flex items-center justify-between text-left">
      <span className="text-ui-footnote font-semibold">{label}</span>
      <Toggle variant="soft" active={active} onChange={onChange} label={label} />
    </WizardPanel>
  );
}

export function LineNumbersStep({ onContinue }: StepProps) {
  const [lineNumbers, setLineNumbers] = useAtom(atom_lineNumbers);
  return (
    <WizardStep
      icon={<HiOutlineViewList size={32} />}
      title="Show line numbers?"
      description="Line numbers make it easier to navigate and discuss specific parts of a note."
      onContinue={onContinue}
    >
      <ToggleRow label="Line numbers" active={lineNumbers} onChange={setLineNumbers} />
    </WizardStep>
  );
}

export function VimStep({ onContinue }: StepProps) {
  const [vimMode, setVimMode] = useAtom(atom_vimMode);
  return (
    <WizardStep
      icon={<HiOutlineLightningBolt size={32} />}
      title="Use Vim keybindings?"
      description="Enable Vim motions and editing modes in the source editor."
      onContinue={onContinue}
    >
      <ToggleRow label="Vim mode" active={vimMode} onChange={setVimMode} />
    </WizardStep>
  );
}

export function FlowModeStep({ onContinue }: StepProps) {
  const [flowMode, setFlowMode] = useAtom(atom_flowMode);
  return (
    <WizardStep
      icon={<HiOutlineEye size={32} />}
      title="Write in flow mode?"
      description="While you write, everything except the current paragraph fades and the line you're typing on stays centered on screen."
      onContinue={onContinue}
    >
      <ToggleRow label="Flow mode" active={flowMode} onChange={setFlowMode} />
    </WizardStep>
  );
}

export function AutosaveStep({ onContinue }: StepProps) {
  const [autosaveMode, setAutosaveMode] = useAtom(atom_autosaveMode);
  return (
    <WizardStep
      icon={<HiOutlineRefresh size={32} />}
      title="Autosave"
      description="Choose when changes get written to disk."
      onContinue={onContinue}
    >
      <div className="w-full text-left">
        <WizardPanel className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider ml-1 opacity-70">Autosave</label>
          <SelectControl value={autosaveMode} onChange={(v) => setAutosaveMode(v as any)}>
            <option value="afterDelay">After 2s Delay</option>
            <option value="onFocusChange">On Focus Change</option>
            <option value="manual">Manual Only</option>
          </SelectControl>
        </WizardPanel>
      </div>
    </WizardStep>
  );
}

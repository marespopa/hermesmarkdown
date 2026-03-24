"use client";

import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import {
  atom_fontFamily,
  atom_fontSize,
  atom_showTimer,
  atom_showStatusBar,
  atom_theme,
  atom_timerSettings,
} from "@/app/atoms/atoms";
import { useRouter } from "next/navigation";
import SettingRow from "../components/SettingRow";
import SegmentedControl from "../components/SegmentedControl";
import Switch from "../components/Switch";
import { fontSizeOptions } from "../constants/fontSizes";
import Input, { Select } from "@/app/components/Input";
import Button from "@/app/components/Button";
import { showSuccessToast } from "@/app/components/Toastr";
import { FaArrowLeft } from "react-icons/fa";

const fontOptions = [
  { value: "Fira Mono, monospace", label: "Fira Mono" },
  { value: "JetBrains Mono, monospace", label: "JetBrains Mono" },
  { value: "Source Code Pro, monospace", label: "Source Code Pro" },
  { value: "Inconsolata, monospace", label: "Inconsolata" },
  { value: "Ubuntu Mono, monospace", label: "Ubuntu Mono" },
];

export default function SettingsPage() {
  const router = useRouter();
  const [theme, _setTheme] = useAtom(atom_theme);
  const [fontFamily, _setFontFamily] = useAtom(atom_fontFamily);
  const [fontSize, _setFontSize] = useAtom(atom_fontSize);
  const [showTimer, _setShowTimer] = useAtom(atom_showTimer);
  const [timerSettings, setTimerSettings] = useAtom(atom_timerSettings);
  const [timerMinutes, setTimerMinutes] = useState(timerSettings.durationInMin);
  const [showStatusBar, setShowStatusBar] = useAtom(atom_showStatusBar);

  const setTheme = (val: string) => {
    _setTheme(val as "light" | "dark");
    showSuccessToast("Theme updated");
  };
  const setFontFamily = (val: string) => {
    _setFontFamily(val);
    showSuccessToast("Font family updated");
  };
  const setFontSize = (val: string) => {
    _setFontSize(val);
    showSuccessToast("Font size updated");
  };
  const setShowTimer = (val: boolean) => {
    _setShowTimer(val);
    showSuccessToast("Timer visibility updated");
  };

  useEffect(() => {
    setTimerMinutes(timerSettings.durationInMin);
  }, [timerSettings.durationInMin]);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 font-mono text-zinc-900 dark:text-zinc-100 selection:bg-zinc-200 dark:selection:bg-zinc-800">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Navigation Header */}
        <header className="mb-16">
          <div className="fixed top-6 left-6 z-30">
            <Button
              variant="bare"
              onClick={() => router.push("/dashboard/editor")}
            >
              ← back_to_editor
            </Button>
          </div>
          <h1 className="text-3xl font-normal font-serif italic tracking-tighter">
            settings
          </h1>
          <p className="text-[12px] text-zinc-400 dark:text-zinc-500 mt-2 lowercase">
            workspace_configuration
          </p>
        </header>

        <main className="space-y-16">
          {/* Appearance Section */}
          <section>
            <header className="mb-4">
              <h2 className="text-lg font-normal font-serif italic text-zinc-800 dark:text-zinc-200 lowercase tracking-tight">
                appearance
              </h2>
            </header>

            <div className="border-t border-zinc-100 dark:border-zinc-800">
              <SettingRow
                title="theme"
                description="visual interface mode."
                control={
                  <SegmentedControl
                    options={[
                      { label: "light", value: "light" },
                      { label: "dark", value: "dark" },
                    ]}
                    value={theme}
                    onChange={(val) => setTheme(val as "light" | "dark")}
                  />
                }
              />
              <SettingRow
                title="font_family"
                description="editor typeface."
                control={
                  <Select
                    name="fontFamily"
                    label=""
                    value={fontFamily}
                    options={fontOptions}
                    handleChange={(e) => setFontFamily(e.target.value)}
                    compact
                  />
                }
              />
              <SettingRow
                title="font_size"
                description="editor base sizing."
                control={
                  <Select
                    name="fontSize"
                    label=""
                    value={fontSize}
                    options={fontSizeOptions}
                    handleChange={(e) => setFontSize(e.target.value)}
                    compact
                  />
                }
              />
            </div>
          </section>

          {/* Productivity Section */}
          <section>
            <header className="mb-4">
              <h2 className="text-lg font-normal font-serif italic text-zinc-800 dark:text-zinc-200 lowercase tracking-tight">
                productivity
              </h2>
            </header>

            <div className="border-t border-zinc-100 dark:border-zinc-800">
              <SettingRow
                title="status_bar"
                description="display word count and metrics."
                control={
                  <Switch checked={showStatusBar} onChange={setShowStatusBar} />
                }
              />
              <SettingRow
                title="session_timer"
                description="visible timer in editor."
                control={<Switch checked={showTimer} onChange={setShowTimer} />}
              />
              <SettingRow
                title="timer_duration"
                description="default session length (min)."
                control={
                  <Input
                    name="timerMinutes"
                    value={timerMinutes}
                    type="number"
                    handleChange={(e) => {
                      const val = Number((e.target as HTMLInputElement).value);
                      setTimerMinutes(
                        Math.max(1, Math.min(120, isNaN(val) ? 1 : val)),
                      );
                    }}
                    validation={{ min: 1, max: 120 }}
                    debounceMs={600}
                    onDebouncedChange={(e) => {
                      const val = Number((e.target as HTMLInputElement).value);
                      setTimerSettings((prev) => ({
                        ...prev,
                        durationInMin: Math.max(
                          1,
                          Math.min(120, isNaN(val) ? 1 : val),
                        ),
                      }));
                      showSuccessToast("Timer duration updated");
                    }}
                    className="!w-24 !text-right !font-mono !text-[12px] !bg-zinc-50 dark:!bg-zinc-900/50 !border-zinc-200 dark:!border-zinc-800"
                  />
                }
              />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import {
  atom_fontFamily,
  atom_fontSize,
  atom_showTimer,
  atom_showStatusBar,
  atom_theme,
  atom_timerSessionState,
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

  // Toast wrappers
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

  // Keep timerMinutes in sync with atom
  useEffect(() => {
    setTimerMinutes(timerSettings.durationInMin);
  }, [timerSettings.durationInMin]);

  // ...existing code...

  // ...existing code...

  // --- Main Render ---
  return (
    <div className="flex min-h-[80vh]">
      {/* Sidebar */}
      <aside className="w-[240px] border-r border-neutral-100 dark:border-neutral-800 py-8 px-4 flex flex-col gap-2 bg-white dark:bg-neutral-950">
        <Button
          variant="secondary"
          label="Back to editor"
          onClick={() => router.push("/dashboard/editor")}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center py-10 px-6">
        <div className="w-full">
          <div className="mb-6">
            <p className="text-xs text-neutral-500 font-mono border border-neutral-100 dark:border-neutral-800 rounded bg-neutral-50 dark:bg-neutral-900 py-2 px-4">
              All changes are saved automatically.
            </p>
          </div>
        </div>
        <div className="w-full">
          {/* Appearance Section */}
          <section className="mb-8">
            <h2
              className="text-lg font-semibold mb-2"
              style={{ fontFamily: "JetBrains Mono, Fira Code, monospace" }}
            >
              Appearance
            </h2>
            <div className="bg-white dark:bg-neutral-900">
              <SettingRow
                title="Theme"
                description="Choose your preferred color mode."
                control={
                  <SegmentedControl
                    options={[
                      { label: "Light", value: "light" },
                      { label: "Dark", value: "dark" },
                    ]}
                    value={theme}
                    onChange={(val) => setTheme(val as "light" | "dark")}
                  />
                }
              />
              <SettingRow
                title="Font family"
                description="Editor monospace font."
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
                title="Font size"
                description="Editor font size in pixels."
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
          <section className="mb-8">
            <h2
              className="text-lg font-semibold mb-2"
              style={{ fontFamily: "JetBrains Mono, Fira Code, monospace" }}
            >
              Productivity
            </h2>
            <div className="bg-white dark:bg-neutral-900">
              <SettingRow
                title="Show Status Bar"
                description="Display the status bar with word/token count and prompt clarity."
                control={<Switch checked={showStatusBar} onChange={setShowStatusBar} />}
              />

              <SettingRow
                title="Show Timer"
                description="Display a session timer in the editor."
                control={<Switch checked={showTimer} onChange={setShowTimer} />}
              />
              <SettingRow
                title="Default Timer"
                description="Default timer duration in minutes."
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
                  />
                }
              />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

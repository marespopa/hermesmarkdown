"use client";

import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import {
  atom_fontFamily,
  atom_fontSize,
  atom_showTimer,
  atom_theme,
  atom_timerSessionState,
} from "@/app/atoms/atoms";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";

const fontOptions = [
  { value: "Fira Mono, monospace", label: "Fira Mono" },
  { value: "JetBrains Mono, monospace", label: "JetBrains Mono" },
  { value: "Source Code Pro, monospace", label: "Source Code Pro" },
  { value: "Inconsolata, monospace", label: "Inconsolata" },
  { value: "Ubuntu Mono, monospace", label: "Ubuntu Mono" },
];

const fontSizeOptions = [
  { value: "14px", label: "Small" },
  { value: "16px", label: "Normal" },
  { value: "18px", label: "Large" },
  { value: "20px", label: "Extra Large" },
];

export default function SettingsPage() {
  const router = useRouter();
  const [theme, setTheme] = useAtom(atom_theme);
  const [fontFamily, setFontFamily] = useAtom(atom_fontFamily);
  const [fontSize, setFontSize] = useAtom(atom_fontSize);
  const [showTimer, setShowTimer] = useAtom(atom_showTimer);
  const [timerSession, setTimerSession] = useAtom(atom_timerSessionState);
  const [timerMinutes, setTimerMinutes] = useState(String(Math.floor(timerSession.duration / 60)));

  useEffect(() => {
    setTimerMinutes(String(Math.floor(timerSession.duration / 60)));
  }, [timerSession.duration]);

  const handleApplyTimer = () => {
    let minutes = Number(timerMinutes) || 1;
    minutes = Math.max(1, Math.min(120, minutes));
    setTimerMinutes(String(minutes));
    setTimerSession((prev) => ({
      ...prev,
      duration: minutes * 60,
      startTime: null,
      pauseTime: 0,
      isTimerCounting: false,
    }));
  };

  const openEditorTool = (flag: string) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(flag, "1");
    }
    router.push("/dashboard/editor");
  };

  return (
    <main className="min-h-screen bg-amber-100 dark:bg-darkbg text-gray-900 dark:text-white">
      <div className="container max-w-screen-lg mx-auto px-6 py-10">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-semibold">Settings</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Advanced options and editor preferences.
            </p>
          </div>
          <Button
            variant="secondary"
            label="Back to editor"
            onClick={() => router.push("/dashboard/editor")}
          />
        </div>

        <section className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-700 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Appearance</h2>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">Theme</span>
              <Button
                variant="secondary"
                label={theme === "light" ? "Switch to dark" : "Switch to light"}
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-300">Font family</span>
                <select
                  className="rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2"
                  value={fontFamily}
                  onChange={(event) => setFontFamily(event.target.value)}
                >
                  {fontOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-300">Font size</span>
                <select
                  className="rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2"
                  value={fontSize}
                  onChange={(event) => setFontSize(event.target.value)}
                >
                  {fontSizeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-700 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Productivity</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">Timer visibility</span>
              <Button
                variant="secondary"
                label={showTimer ? "Hide timer" : "Show timer"}
                onClick={() => setShowTimer(!showTimer)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">Default timer (minutes)</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={timerMinutes}
                  onChange={(event) => setTimerMinutes(event.target.value.replace(/[^0-9]/g, ""))}
                  className="w-24 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
                />
                <Button variant="secondary" label="Apply" onClick={handleApplyTimer} />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-700 p-6">
          <h2 className="text-lg font-semibold mb-4">Advanced tools</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button
              variant="secondary"
              label="Open PDF export"
              onClick={() => openEditorTool("hm_open_pdf_preview")}
            />
            <Button
              variant="secondary"
              label="Open table editor"
              onClick={() => openEditorTool("hm_open_table_editor")}
            />
            <Button
              variant="secondary"
              label="Keyboard shortcuts"
              onClick={() => openEditorTool("hm_open_shortcuts")}
            />
          </div>
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
            These tools open inside the editor to keep the workspace focused.
          </div>
        </section>
      </div>
    </main>
  );
}

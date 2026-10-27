"use client";

import { useAtom } from "jotai";
import { atom_companionOpen } from "@/app/atoms/companion-atoms";
import { atom_sidebarOpen } from "@/app/atoms/ui-atoms";
import { useRegisterCommand } from "@/app/components/CommandPalette/CommandPaletteContext";
import { formatShortcut } from "@/app/utils/platform";

// The shell's own palette commands: show / hide the sidebar and the AI
// companion. EditorShell mounts it on every route that has them, so they work
// with no note open too; `hasCompanion` is false until AI is set up.
export default function ShellCommands({ hasCompanion }: { hasCompanion: boolean }) {
  const [sidebarOpen, setSidebarOpen] = useAtom(atom_sidebarOpen);
  const [companionOpen, setCompanionOpen] = useAtom(atom_companionOpen);

  useRegisterCommand({
    id: "toggle-sidebar",
    label: sidebarOpen ? "Hide Sidebar" : "Show Sidebar",
    keywords: "sidebar open notes files tree navigation panel show hide toggle",
    shortcut: formatShortcut("\\"),
    action: () => setSidebarOpen(!sidebarOpen),
  });
  useRegisterCommand(hasCompanion ? {
    id: "toggle-companion",
    label: companionOpen ? "Hide AI Companion" : "Show AI Companion",
    category: "AI",
    keywords: "ai companion assistant chat panel show hide toggle",
    action: () => setCompanionOpen(!companionOpen),
  } : null);
  return null;
}

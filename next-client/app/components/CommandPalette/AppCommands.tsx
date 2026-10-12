"use client";

import { useAtom } from "jotai";
import { usePathname, useRouter } from "next/navigation";
import { atom_keyboardShortcutsOpen, atom_theme, type Theme } from "@/app/atoms/ui-atoms";
import RegisteredCommands from "@/app/editor/components/editor-commands/RegisteredCommands";
import { type Command, useRegisterCommand } from "./CommandPaletteContext";

const THEME_COMMANDS: { value: Theme; label: string }[] = [
  { value: "light", label: "Theme: Light" },
  { value: "dark", label: "Theme: Dark" },
  { value: "system", label: "Theme: System" },
];

// The app-wide commands, registered once for every route (the editor adds
// its own on top): navigation, Settings, theme and keyboard shortcuts.
// Editor preferences live in SettingsCommands.
export default function AppCommands() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [theme, setTheme] = useAtom(atom_theme);
  const [, setKeyboardShortcutsOpen] = useAtom(atom_keyboardShortcutsOpen);
  const inEditor = pathname.startsWith("/editor");

  // The marketing site's landing page. Inside the editor "Home" means the
  // vault's home feed (`open-home-feed`), so this one stays out of the way.
  useRegisterCommand(
    inEditor
      ? null
      : {
          id: "open-website",
          label: "Open HermesMarkdown Website",
          description: "The HermesMarkdown landing page",
          category: "Navigation",
          keywords: "home start landing website site",
          disabledReason: pathname === "/" ? "Already on the website" : undefined,
          action: () => router.push("/"),
        },
  );

  useRegisterCommand({
    id: "go-editor",
    label: "Open Editor",
    description: "Return to the Markdown editor",
    category: "Navigation",
    keywords: "write notes vault",
    disabledReason: pathname === "/editor" ? "Already in editor" : undefined,
    action: () => router.push("/editor"),
  });

  useRegisterCommand({
    id: "open-documentation",
    label: "Open Documentation",
    category: "Help",
    keywords: "docs help guide",
    disabledReason: pathname === "/documentation" ? "Already viewing documentation" : undefined,
    action: () => router.push("/documentation"),
  });

  // The free tools are their own site area, not part of writing: offered
  // everywhere but the editor.
  useRegisterCommand(
    inEditor
      ? null
      : {
          id: "open-tools",
          label: "Open Free Tools",
          description: "Table generator, Mermaid, tokenizer, token cost and more",
          category: "Navigation",
          keywords: "tools markdown table generator mermaid tokenizer token cost calculator price cleaner converter html",
          disabledReason: pathname === "/tools" ? "Already viewing the tools" : undefined,
          action: () => router.push("/tools"),
        },
  );

  useRegisterCommand({
    id: "open-settings",
    label: "Open Settings",
    category: "Settings",
    keywords: "preferences configuration config",
    disabledReason: pathname === "/editor/settings" ? "Already in settings" : undefined,
    action: () => router.push("/editor/settings"),
  });

  useRegisterCommand({
    id: "show-keyboard-shortcuts",
    label: "Show Keyboard Shortcuts",
    category: "Help",
    keywords: "shortcuts hotkeys keybindings help",
    action: () => setKeyboardShortcutsOpen(true),
  });

  // One command per theme; the current one is disabled.
  const themeCommands: Command[] = THEME_COMMANDS.map(({ value, label }) => ({
    id: `set-theme-${value}`,
    label,
    category: "Settings",
    keywords: "theme appearance color mode dark light system",
    disabledReason: theme === value ? "Current theme" : undefined,
    action: () => setTheme(value),
  }));

  return <RegisteredCommands commands={themeCommands} />;
}

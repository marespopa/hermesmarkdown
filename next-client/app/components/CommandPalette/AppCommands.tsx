"use client";

import { useAtom } from "jotai";
import { usePathname, useRouter } from "next/navigation";
import { atom_darkTheme, atom_keyboardShortcutsOpen, atom_lightTheme, atom_theme, type Theme } from "@/app/atoms/ui-atoms";
import { DARK_THEMES, LIGHT_THEMES, resolveDarkTheme, resolveLightTheme } from "@/app/theme-palettes";
import RegisteredCommands from "@/app/editor/components/editor-commands/RegisteredCommands";
import { type Command, useRegisterCommand } from "./CommandPaletteContext";
import { pageShortcutFor } from "./page-shortcuts";

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
  const [lightTheme, setLightTheme] = useAtom(atom_lightTheme);
  const [darkTheme, setDarkTheme] = useAtom(atom_darkTheme);
  const [, setKeyboardShortcutsOpen] = useAtom(atom_keyboardShortcutsOpen);
  const inEditor = pathname.startsWith("/editor");

  // The marketing site's landing page: not part of writing, so the editor
  // leaves it out.
  useRegisterCommand(
    inEditor
      ? null
      : {
          id: "open-website",
          label: "Open HermesMarkdown Website",
          description: "The HermesMarkdown landing page",
          category: "Navigation",
          opens: "page",
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
    opens: "page",
    keywords: "write notes vault",
    disabledReason: pathname === "/editor" ? "Already in editor" : undefined,
    action: () => router.push("/editor"),
  });

  useRegisterCommand({
    id: "open-documentation",
    label: "Open Documentation",
    category: "Help",
    // A new tab, so the note you're writing stays where it is.
    opens: "tab",
    keywords: "docs help guide manual",
    disabledReason: pathname === "/documentation" ? "Already viewing documentation" : undefined,
    action: () => { window.open("/documentation", "_blank", "noopener"); },
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
          opens: "page",
          keywords: "tools markdown table generator mermaid tokenizer token cost calculator price cleaner converter html",
          disabledReason: pathname === "/tools" ? "Already viewing the tools" : undefined,
          action: () => router.push("/tools"),
        },
  );

  // The editor's pages, from any route: the palette is the way around (the
  // sidebar holds only the vault's files and the note's outline). On the
  // editor itself Tasks and Templates come from its own commands, so they
  // aren't listed twice.
  const page = (id: string, label: string, href: string, keywords: string, onEditorToo = true): Command | null =>
    !onEditorToo && pathname === "/editor"
      ? null
      : {
          id,
          label,
          category: "Navigation",
          opens: "page",
          keywords,
          shortcut: pageShortcutFor(id),
          disabledReason: pathname.startsWith(href) ? `Already in ${label.replace(/^(Open|Show) /, "")}` : undefined,
          action: () => router.push(href),
        };
  const pageCommands = [
    page("open-all-notes", "Open All Files", "/editor/files", "files notes list library browse vault"),
    page("open-tags", "Open Tags", "/editor/tags", "tags hashtags labels topics browse"),
    page("show-changes", "Show Changes", "/editor/changes", "git changes diff modified added deleted commit head status review files changed pull request"),
    page("open-trash", "Open Trash", "/editor/trash", "trash deleted restore put back recover bin"),
    page("go-tasks", "Open Tasks", "/editor/tasks", "tasks todos checklist", false),
    page("go-templates", "Open Templates", "/editor/templates", "templates template packs manage", false),
  ].filter((command): command is Command => !!command);

  useRegisterCommand({
    id: "open-settings",
    label: "Open Settings",
    category: "Settings",
    opens: "page",
    keywords: "preferences configuration config",
    shortcut: pageShortcutFor("open-settings"),
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

  // One command per palette of each mode, e.g. "Light Theme: Paper".
  const currentLight = resolveLightTheme(lightTheme);
  const currentDark = resolveDarkTheme(darkTheme);
  const paletteCommands: Command[] = [
    ...LIGHT_THEMES.map((t): Command => ({
      id: `set-light-theme-${t.value}`,
      label: `Light Theme: ${t.label}`,
      description: `${t.description}, used in light mode`,
      category: "Settings",
      keywords: "theme palette appearance colors light",
      disabledReason: currentLight === t.value ? "Current light theme" : undefined,
      action: () => setLightTheme(t.value),
    })),
    ...DARK_THEMES.map((t): Command => ({
      id: `set-dark-theme-${t.value}`,
      label: `Dark Theme: ${t.label}`,
      description: `${t.description}, used in dark mode`,
      category: "Settings",
      keywords: "theme palette appearance colors dark",
      disabledReason: currentDark === t.value ? "Current dark theme" : undefined,
      action: () => setDarkTheme(t.value),
    })),
  ];

  return <RegisteredCommands commands={[...pageCommands, ...themeCommands, ...paletteCommands]} />;
}

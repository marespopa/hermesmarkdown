import { Callout, KV, type Group } from "../doc-primitives";
import TextLink from "@/app/components/TextLink";

// Documentation content: Settings and Mobile groups.
export const settingsGroup: Group = {
  id: "settings",
  label: "Settings",
  items: [
    {
      id: "appearance",
      title: "Appearance",
      lead: "Pick a theme, the font you write in and the text size.",
      keywords: "theme palette colors solarized sepia paper plain nord ink graphite dark light font code font monospace syntax typography text size sidebar layout full width focus",
      body: (
        <>
          <p>
            System/light/dark theme controls are available in Settings → Appearance and from the
            command palette (<strong>Theme: Light</strong>, <strong>Theme: Dark</strong>,{" "}
            <strong>Theme: System</strong>). System follows your operating system automatically.
            Each mode has its own color theme: Paper (the default), Sepia, Solarized or Plain for light,
            and Ink (the default), Nord, Solarized or Graphite for dark. Paper and Ink are paper and blue ink (Ink is
            the dark paper); Sepia is a warm cream page for long reading; Plain and Graphite are neutral, with no tint. Every theme has a faint paper grain. You can also pick them on the
            home page before you start. Each theme has its own accent hue, kept to the
            caret, text selection, focus rings, toggles and selections; icons and buttons stay quiet ink on paper. In code blocks, keywords take that accent, and
            strings, numbers and function names each get a color of their own from the theme. Settings → Appearance shows the colors for the
            mode you picked, and both under System; the command palette also has{" "}
            <strong>Light Theme: …</strong> and <strong>Dark Theme: …</strong>. The
            editor font, code font (for code blocks and inline code), text size and Full Width (on by default) are set under Settings →
            Appearance → Typography and apply across the editor. Vim mode and{" "}
            <TextLink href="#focus">Focus</TextLink> are under Settings →
            Editor. Word wrap, line numbers and invisibles (¶ on empty lines, dots for spaces) are
            command palette toggles: <strong>Toggle Word Wrap</strong>,{" "}
            <strong>Toggle Line Numbers</strong>, <strong>Toggle Invisibles</strong>.
          </p>
          <KV
            rows={[
              { label: "Theme", value: "Settings → Appearance" },
              { label: "Light / Dark theme", value: "Paper, Sepia, Solarized, Plain / Ink, Nord, Solarized, Graphite" },
              { label: "Sidebar", value: "The Sidebar button, CTRL/CMD+\\, CTRL/CMD+ALT+S or Toggle Sidebar: navigation and the vault's files on the window's left edge, on every editor page (desktop)" },
              { label: "Typeface", value: "Quattro by default, Duospace or Geist Mono" },
              { label: "Code font", value: "Geist Mono by default, JetBrains Mono, Fira Code or your system's monospace" },
            ]}
          />
          <Callout type="note">
            Quattro is the default for writing: proportional, so a note reads like a page of a
            book. Geist Mono gives an even, typewriter-like rhythm, and Duospace keeps that
            rhythm while giving wide letters like m and w more room, so lines lose a
            monospace&apos;s gaps. Text sizes follow Apple&apos;s Dynamic Type steps, 15 to 23px.
          </Callout>
        </>
      ),
    },
    {
      id: "vault-home-settings",
      title: "New files & templates",
      lead: "Choose where new files go. Templates always live in templates/.",
      keywords: "new files folder new notes folder templates folder template packs settings vault",
      body: (
        <>
          <KV
            rows={[
              { label: "New Files Folder", value: "Empty = vault root, or a folder like inbox" },
            ]}
          />
          <p>
            New drafts are saved there, and so are notes made from a template or a link that
            names no folder. It lives under <strong>Settings → Files</strong>; a folder that
            doesn&apos;t exist yet is created the first time a note is saved there.
          </p>
          <p>
            Templates are always in <code>templates/</code> at the root of your vault, made the
            first time you need it: every <code>.md</code> file directly in it, or one folder down
            (a <TextLink href="#template-packs">template pack</TextLink>), is a{" "}
            <TextLink href="#templates">template</TextLink>.
          </p>
        </>
      ),
    },
    {
      id: "keybindings",
      title: "Keybindings",
      lead: "Shortcuts are fixed — there's no remapping screen yet.",
      keywords: "keybindings remap customize shortcuts",
      body: (
        <>
          <p>
            Every shortcut in HermesMarkdown is built in and not user-configurable. See{" "}
            <TextLink href="#keyboard-shortcuts">Keyboard shortcuts</TextLink>{" "}
            for the full reference grouped by context.
          </p>
        </>
      ),
    },
  ],
};

export const mobileGroup: Group = {
  id: "mobile",
  label: "Mobile",
  items: [
    {
      id: "mobile-layout",
      title: "Mobile layout",
      lead: "Below a 768px viewport, the palette button becomes a fixed file indicator bar, and Files opens full screen.",
      keywords: "mobile overlay breakpoint chrome command palette file indicator",
      body: (
        <>
          <p>
            A thin bar stays fixed at the top of the screen showing the active file's name and save
            status — there's no keyboard shortcut for the command palette on mobile, so tapping this
            bar is the one always-present way to open it. From there, Show Files, Search, Open Tasks,
            New File, and every other command work exactly as they do on desktop.
          </p>
          <p>Files and Search open full screen rather than as docked panels.</p>
        </>
      ),
    },
    {
      id: "vaults-on-mobile",
      title: "Vaults on phones and tablets",
      lead: "iPhone and iPad use browser vaults; install the app to your home screen to write offline.",
      keywords: "mobile iphone ipad ios android vault offline install home screen pwa backup",
      body: (
        <>
          <KV
            rows={[
              { label: "iPhone / iPad (Safari)", value: "Browser vault" },
              { label: "Android (Chrome)", value: "Folder on the device or browser vault" },
              { label: "Other mobile browsers", value: "Browser vault" },
            ]}
          />
          <p>
            From the command palette, choose <strong>Browser vaults…</strong>{" "}
            to create or reopen one. On iOS, use <em>Share → Add to Home Screen</em>: the installed
            app opens full-screen and starts without a connection.
          </p>
          <Callout type="warning">
            iOS may clear a website&apos;s data when it hasn&apos;t been used for a while. Installing
            to the home screen protects it, and <strong>Export vault as zip</strong> keeps a backup
            in Files. To import on iOS, pick a <code>.zip</code> or individual files — folder picking
            isn&apos;t available there. See{" "}
            <TextLink href="#browser-vaults">Browser vaults</TextLink>.
          </Callout>
        </>
      ),
    },
    {
      id: "table-editor-mobile",
      title: "Table editor on mobile",
      lead: "Tables edit in place, same as desktop.",
      keywords: "table mobile tap long-press menu",
      body: (
        <>
          <p>
            Tables use the same in-place cell editing as desktop. Tap a cell to type in it, and tap a
            column letter or row number (or long-press a cell on Android) for the table menu.
          </p>
          <p>
            Cell navigation works the same as desktop. Only the surrounding chrome changes.
          </p>
        </>
      ),
    },
    {
      id: "differences-from-desktop",
      title: "Differences from desktop",
      lead: "Mobile trades some desktop-only surfaces for touch-first equivalents — the underlying editing model is unchanged.",
      keywords: "mobile desktop differences selection toolbar",
      body: (
        <>
          <KV
            rows={[
              { label: "Files", value: "Full screen instead of the sidebar" },
              { label: "Vaults", value: "Browser vaults on iPhone/iPad; see Vaults on phones and tablets" },
            ]}
          />
          <p>
            Selecting text shows the same toolbar on both: Turn into (text, headings, lists, quote), Bold, Italic, Link, and Ask AI
            when AI is set up. On desktop it sits above the selection; on mobile it sits at the bottom
            of the screen, above the keyboard, clear of the phone&apos;s own Copy/Paste bar. AI Chat is also in the
            command palette.
          </p>
        </>
      ),
    },
  ],
};

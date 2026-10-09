import { Callout, KV, type Group } from "../doc-primitives";

// Documentation content: Settings and Mobile groups.
export const settingsGroup: Group = {
  id: "settings",
  label: "Settings",
  items: [
    {
      id: "appearance",
      title: "Appearance",
      lead: "Theme and a small editorial typeface pair shape the editor's paper-like writing surface.",
      keywords: "theme dark light font typography sidebar",
      body: (
        <>
          <p>
            System/light/dark theme controls are available in Settings → Appearance and from the
            command palette. System follows your operating system automatically. The editor font is
            set under Settings → Typography and applies to every pane in a split workspace. Word
            wrap, line numbers, Show Invisibles (¶ on empty lines, dots for spaces), Vim mode, flow
            mode and Hide Interface While Typing live under Settings → Editor.
          </p>
          <KV
            rows={[
              { label: "Theme", value: "Settings → Appearance" },
              { label: "Sidebar", value: "Show Sidebar: open notes and the vault's files on the window's left edge (desktop)" },
              { label: "Typeface", value: "Plus Jakarta Sans by default, with Source Serif 4, Inter, and Geist Mono options" },
            ]}
          />
          <Callout type="note">
            Plus Jakarta Sans is the default for comfortable long-form writing. Source Serif 4 gives
            essays a printed-page feel, Inter is a neutral screen sans, and Geist Mono suits
            technical notes. Text sizes follow Apple&apos;s Dynamic Type steps, 15 to 23px.
          </Callout>
        </>
      ),
    },
    {
      id: "vault-home-settings",
      title: "New notes & templates",
      lead: "Choose where new notes go and where templates live.",
      keywords: "new notes folder templates folder settings vault",
      body: (
        <>
          <KV
            rows={[
              { label: "New Notes Folder", value: "Empty = vault root, or a folder like inbox" },
              { label: "Templates Folder", value: "Per vault. Empty = templates, _templates or Templates" },
            ]}
          />
          <p>
            Every <code>.md</code> file directly in the Templates Folder is a{" "}
            <a href="#templates" className="text-accent hover:underline">template</a>.
            Folders starting with <code>.</code> can&apos;t be used, because they aren&apos;t
            indexed.
          </p>
          <p>
            These live under <strong>Settings → Files</strong>. A folder that doesn&apos;t exist
            yet is created the first time a note is saved there.
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
            <a href="#keyboard-shortcuts" className="text-accent hover:underline">Keyboard shortcuts</a>{" "}
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
      lead: "Below a 768px viewport, the tab bar is replaced by a fixed file indicator bar and full-screen overlays.",
      keywords: "mobile overlay breakpoint chrome command palette file indicator",
      body: (
        <>
          <p>
            A thin bar stays fixed at the top of the screen showing the active file's name and save
            status — there's no keyboard shortcut for the command palette on mobile, so tapping this
            bar is the one always-present way to open it. From there, Open Explorer, Search, Open Tasks,
            New file, and every other command work exactly as they do on desktop.
          </p>
          <p>
            The <strong>Home</strong> button at the left of that bar takes you back to the{" "}
            <a href="#home-feed" className="text-accent hover:underline">home feed</a>.
            On the feed, the search bar and the <strong>+</strong> button sit at the bottom, within
            reach of your thumb.
          </p>
          <p>Explorer and Search open as full-screen overlays rather than docked panels.</p>
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
              { label: "iPhone / iPad (Safari)", value: "Browser vault or GitHub vault" },
              { label: "Android (Chrome)", value: "Folder on the device, browser vault, or GitHub vault" },
              { label: "Other mobile browsers", value: "Browser vault or GitHub vault" },
            ]}
          />
          <p>
            Open the file overlay (or the command palette) and choose <strong>Browser Vault</strong>{" "}
            to create or reopen one. On iOS, use <em>Share → Add to Home Screen</em>: the installed
            app opens full-screen and starts without a connection.
          </p>
          <Callout type="warning">
            iOS may clear a website&apos;s data when it hasn&apos;t been used for a while. Installing
            to the home screen protects it, and <strong>Export vault as zip</strong> keeps a backup
            in Files. To import on iOS, pick a <code>.zip</code> or individual notes — folder picking
            isn&apos;t available there. See{" "}
            <a href="#browser-vaults" className="text-accent hover:underline">Browser vaults</a>.
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
              { label: "Explorer", value: "Full-screen file-management view" },
              { label: "Smart Workspaces", value: "Views tab in the file overlay" },
              { label: "Selection toolbar", value: "Bold, Italic, Link only" },
              { label: "Vaults", value: "Browser vaults on iPhone/iPad; see Vaults on phones and tablets" },
            ]}
          />
          <p>
            Selecting text shows the same toolbar on both: Turn into (text, headings, lists, quote), Bold, Italic, Link, and Ask AI
            when AI is set up. On desktop it sits above the selection; on mobile it sits at the bottom
            of the screen, above the keyboard, clear of the phone&apos;s own Copy/Paste bar. AI Chat and Repurpose Note are also in the
            command palette.
          </p>
        </>
      ),
    },
  ],
};

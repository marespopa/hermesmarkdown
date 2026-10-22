# Design System

## Overview

The color system has two layers:

1. **CSS custom properties** in `app/globals.scss` — the single source of truth for mode-aware colors.
2. **Tailwind tokens** in `tailwind.config.js` — map to either CSS vars (mode-aware) or hard-coded hex (static).

Dark mode is controlled by the `html.dark` class (set by the theme toggle). Because Tailwind tokens reference CSS vars, there is no need for `dark:` class variants on semantic colors — they switch automatically.

Surfaces are neutral; the two accents (clay and moss) are used for interactive and status elements, never as backgrounds.

---

## Color Tokens

### Semantic (mode-aware)

These change between light and dark mode. Always prefer these over static colors for any surface, text, or border that appears in both modes.

| Token | CSS var | Light | Dark | Usage |
|---|---|---|---|---|
| `bg-surface` | `--surface` | `#FAF9F7` | `#211E1B` | Editor / page background |
| `bg-surface-raised` | `--surface-raised` | `#F2F1EE` | `#2A2622` | Elevated cards, panels |
| `bg-chrome` | `--chrome` | `#F0EFEC` | `#181614` | Tab bar, file indicator, palette footer |
| `bg-overlay` | `--overlay` | `#FCFAF6` | `#2A2622` | Modals, popovers, command palette — never the page color: lighter in light themes, the raised gray in dark ones |
| `bg-input-bg` | `--input-bg` | `#FFFFFF` | `#1C1A17` | Form inputs (`Input`, `Textarea`, select) — white in light themes |
| `border-edge` | `--border` | `#DEDCD7` | `#3D3833` | Visible borders |
| `border-edge-subtle` | `--border-subtle` | `rgba(60,56,50,0.10)` | `rgba(214,207,198,0.10)` | Hairline / ghost borders |
| `text-fg` | `--fg` | `#2A2825` | `#ECE7E0` | Primary text |
| `text-fg-muted` | `--fg-muted` | `#5E5B56` | `#A8A199` | Secondary / supporting text |
| `text-fg-faint` | `--fg-faint` | `#6D6B67` | `#948F87` | Placeholders, hints, tertiary labels |
| `accent` | `--clay` | `#A2563E` | `#D88B68` | Primary accent — active states, focus, unsaved dot |
| `accent-hover` | `--clay` | same as `accent` | same as `accent` | Alias; no distinct hover value today |
| `sage` | `--moss` | `#626F54` | `#8FA178` | Secondary accent — icons, muted interactive |
| `sage-hover` | `--moss-hover` | `#5C6A4E` | `#A3B58C` | Hover / active state for sage buttons |

`sage-subtle`, `sage-light` and `sage-dark` still exist for backwards compatibility but all resolve to `var(--moss)` — they are **not** distinct shades. Use `sage` with an opacity modifier (`bg-sage/10`, `ring-sage/20`) instead.

CSS-only variables (no Tailwind token):

| CSS var | Light | Dark | Usage |
|---|---|---|---|
| `--link` / `--link-hover` | `#2C66D1` / `#1764D8` | `#64A8FF` / `#8DBEFF` | Links in the editor |
| `--caret` | `#3B82F6` | `#3B82F6` | Editor caret, and Vim's block cursor (tinted) |
| `--selection` | `rgba(59,130,246,0.22)` | `rgba(59,130,246,0.32)` | Text selection, in the editor and app-wide `::selection` |
| `--frontmatter-bg` / `--frontmatter-bg-hover` | `rgba(60,56,50,0.035)` / `0.055` | `rgba(214,207,198,0.04)` / `0.065` | Frontmatter block background |
| `--frontmatter-label-opacity` | `0.4` | `0.5` | Frontmatter key labels |

**Source:** `app/globals.scss` `:root` and `html.dark` blocks.

### Static (same in both modes)

These do not respond to theme changes. Use them when you explicitly need a fixed color regardless of mode.

| Token | Hex | Usage |
|---|---|---|
| `stone` | `var(--fg-faint)` | Alias of `fg-faint` (mode-aware despite living here). Opacity modifiers such as `text-stone/45` do not work on var-backed colors — use an arbitrary hex like `text-[#9A968F]/45` |
| `clay` | `#3A3631` | Dark-mode border / interactive surface. **Not** the clay accent — that is `accent` (`--clay`) |
| `beige` | `#D8D5CE` | Warm neutral border / decorative |
| `beige-light` | `#E9E7E2` | Subtle fills |
| `paper-pale` | `#FAF9F7` | Light surface alias |
| `paper-light` | `#F2F1EE` | Light raised surface alias |
| `paper-softgray` | `#E9E7E2` | Alternate light surface |
| `paper-dark` | `#181614` | Dark chrome alias |
| `paper-dark-surface` | `#2A2622` | Dark raised surface alias |
| `ink-light` | `#2A2825` | Explicit light-mode text alias |
| `ink-hover` | `#3A3733` | Primary button hover text |
| `ink-dark` | `#ECE7E0` | Explicit dark-mode text alias |
| `ink-muted` | `#6B6862` | Static muted text |

**Source:** `tailwind.config.js` `theme.extend.colors`.

---

## Materials

Anything that floats over the page is frosted glass, Apple-style: a tint of the surface it stands for, a heavy blur with a saturation boost, a hairline edge, a light inner top edge and a layered shadow. Two classes in `globals.scss` carry it; components keep their own shape (radius, padding) and leave background, border colour and shadow utilities off.

| Class | Use | Tint |
|-------|-----|------|
| `glass-bar` | Bars over the page: pane tab bar, sidebar, mobile file bar, Files list header, Settings sidebar | `--material-bar` (72% `--chrome`) |
| `glass-panel` | Floating panels: menus, popovers, tooltips, toasts (the welcome-back card and react-hot-toast notifications), the command palette, dialogs, the mobile navigation menu, the selection toolbar, the slash menu and find bar | `--material-panel` (90% `--overlay`: mostly opaque, so text on it reads over a busy page) |

- Tokens: `--material-bar`, `--material-panel`, `--material-blur` (`blur(24px) saturate(180%)`), `--material-edge`, `--material-highlight`, `--material-shadow`. Styles set from script (CodeMirror themes) use the tokens directly.
- `glass-bar` draws its glass on a `::before` layer behind the content, never on the element: a `backdrop-filter` on the parent of a scroll area sends the wheel to whatever scrolls underneath in Chromium. `glass-panel` blurs the element itself, so enter animations keep the blur.
- Inside a panel, highlight rows and wells with translucent fills (`bg-black/[0.05]`, `dark:bg-white/[0.08]`), never solid surface tokens, so the glass shows through.
- Full-screen mobile sheets (palette, shortcuts) stay solid (`bg-overlay`, `bg-chrome`): there's nothing behind them worth showing.
- Fallbacks are at the token level: without `backdrop-filter`, with Reduce Transparency, or with Increase Contrast (which also strengthens the edge to `--border`), both materials become their solid surface.

## Accessibility (WCAG AA)

Minimum contrast ratios per WCAG 2.1:
- **4.5:1** — normal text, placeholder text, icon labels
- **3:1** — large text (18px+ regular, 14px+ bold), UI component boundaries (focus rings, button borders)

### Measured ratios

Computed from the values above. Every text token meets AA (4.5:1) on `bg-surface`, `bg-surface-raised` and `bg-chrome` in both modes; keep it that way when changing colors.

| Pair | Light | Dark | Level |
|---|---|---|---|
| `text-fg` on `bg-surface` / `bg-chrome` | 14.0 / 12.8 | 13.5 / 14.7 | AAA |
| `text-fg-muted` on `bg-surface` / `bg-chrome` | 6.4 / 5.9 | 6.5 / 7.1 | AA |
| `text-fg-faint` (and `stone`) on `bg-surface` / `bg-chrome` | 5.1 / 4.6 | 5.2 / 5.6 | AA |
| `text-accent` on `bg-surface` / `bg-chrome` | 5.1 / 4.6 | 6.2 / 6.7 | AA |
| `text-sage` on `bg-surface` / `bg-chrome` | 5.1 / 4.7 | 6.0 / 6.5 | AA |
| `--link` on `bg-surface` / `bg-chrome` | 5.1 / 4.6 | 6.8 / 7.4 | AA |

### Rules

- `fg-faint` is the lightest text token. Don't introduce a lighter gray for readable text; for purely decorative lines use `border-edge-subtle` or opacity.
- Opacity-reduced text (`text-fg/50`, arbitrary hex with `/NN`) is decorative only — it drops below AA.
- A single static gray cannot reach 4.5:1 on both the light and dark surfaces, so readable text must use a mode-aware token.

---

## How to Change a Color

### Changing a semantic color (mode-aware)

Edit `app/globals.scss`:

```scss
:root {
  --fg-faint: #6D6B67; /* ← change light-mode value here */
}

html.dark {
  --fg-faint: #948F87; /* ← change dark-mode value here */
}
```

The Tailwind token (`text-fg-faint`) picks up the new value automatically — no Tailwind config change needed.

**Always update both `:root` and `html.dark` when changing a semantic token.**

### Changing a static color

Edit `tailwind.config.js` under `theme.extend.colors`. After editing, restart the dev server so Tailwind rebuilds the utility classes.

### Adding a new semantic color

1. Add the CSS var to both `:root` and `html.dark` in `globals.scss`.
2. Add a Tailwind mapping in `tailwind.config.js`:
   ```js
   'my-token': 'var(--my-token)',
   ```
3. Verify contrast for both modes before shipping.

### Adding a new static color

Add it directly to `tailwind.config.js` under the relevant group. Document whether it is text-safe or decorative-only with a comment.

---

## Typography Scale

Defined in `tailwind.config.js` as custom `fontSize` entries. Sizes and line heights follow Apple's HIG text styles (iOS Dynamic Type "Large" defaults); tracking tightens as the size grows (first tuned for Inter, kept for Plus Jakarta Sans).

| Token | Size | Line height | HIG style | Use |
|---|---|---|---|---|
| `text-ui-title-1` | 28px | 34px | Title 1 | Page / modal headings |
| `text-ui-title-2` | 22px | 28px | Title 2 | Section headings |
| `text-ui-title-3` | 20px | 25px | Title 3 | Card / panel headings |
| `text-ui-body` | 17px | 22px | Body | Body copy |
| `text-ui-callout` | 16px | 21px | Callout | Callouts, descriptions |
| `text-ui-subhead` | 15px | 20px | Subheadline | Labels, nav items |
| `text-ui-footnote` | 13px | 18px | Footnote | Buttons, badges, captions |
| `text-ui-caption` | 12px | 16px | Caption 1 | Timestamps, metadata |
| `text-ui-micro` | 11px | 13px | Caption 2 | Tiny labels, tooltips |

---

## Font Families

Three self-hosted faces (`app/fonts.ts`), the "Editorial Craft" pairing: Plus Jakarta Sans for everything sans, Instrument Serif for the hero headings of the landing and marketing pages, and Geist Mono for code. The sans and hero stacks are the `--landing-body` and `--landing-hero` tokens in `globals.scss`; every stack falls back to a system face with the same role. Two more are writing-only options, both built on IBM Plex and bundled unmodified under the SIL OFL (licence alongside the files), loaded only when picked: Duospace (`app/font-files/duospace/`, duospaced) and Quattro (`app/font-files/quattro/`, proportional).

| Token | Stack | Use |
|---|---|---|
| `font-sans` | Plus Jakarta Sans → system-ui (SF Pro) | UI chrome, labels, buttons, headings (also the `body` default) |
| `font-hero` | Instrument Serif → Georgia → serif | The `h1` of the landing, docs, tools, legal, contact and error pages. One weight: use with `font-normal` |
| `font-mono` | Geist Mono → SF Mono → Menlo | Code, keyboard chips, technical metadata, and a writing choice |

The editor font is user-selectable (Settings → Typography) from `app/editor/settings/font-options.ts`: Quattro (default, so a note reads as a page), Geist Mono, Duospace (set without tracking, like the monospace: `data-font="mono"`) or Quattro. Plus Jakarta Sans is the interface face only; a saved sans writing choice (Inter, Plus Jakarta Sans) and the retired Source Serif 4 move to Quattro on load, and a saved Inter or Source Serif reading font moves to Plus Jakarta Sans. Text size offers the Dynamic Type body steps 15 / 17 (default) / 19 / 21 / 23px. Those two are the only typography settings. Line height (1.65), the reading measure (≤ 44rem / 704px, the same at every text size), heading rhythm and code styling are fixed in `app/editor/editor-typography.scss`.

---

## Motion

Layout motion uses one timing: `--layout-duration` (150ms) on `--ease-layout` (`cubic-bezier(0.4, 0, 0.2, 1)`, ease-in-out), as Tailwind `duration-layout ease-layout`. That covers the sidebar sliding (`WorkspaceSidebar`), the content it pushes (the editor page and `ShellPage`), the editor sheet's width and margins (`MarkdownEditor`, `.editor-canvas`) and the pane. Overlay sheets and drawers slide in `duration-overlay-panel` (150ms) over a `duration-overlay-backdrop` fade (150ms). Colour changes on hover stay at 150ms. Anything that moves layout also takes `motion-reduce:transition-none`.

## Counts

Every count (tags, task groups, the Tasks header and tabs, the word count) is a `CountBadge` (`app/components/CountBadge`): `text-ui-caption`, tabular figures, `text-fg-faint`, thousands separators (`1,204`). A count floating over content uses its `floating` variant, a flat raised chip (no glass). Inline tags keep the editor's `.cm-tag-pill` look, which the frontmatter row's chips reuse.

## Dark Mode

Dark mode is toggled by adding/removing the `dark` class on `<html>`. The implementation deliberately avoids `dark:` Tailwind variants for semantic colors — the CSS var layer handles it.

Use `dark:` prefixes only when:
- A **static** color needs a different value in dark mode (e.g., `dark:bg-paper-dark`)
- An opacity or structural tweak is mode-specific (e.g., `dark:opacity-80`)

Never use `dark:text-fg` or `dark:bg-surface` — they are redundant since those tokens already switch.

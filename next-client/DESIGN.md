# Design System

## Overview

The color system has two layers:

1. **CSS custom properties** in `app/globals.scss` — the single source of truth for mode-aware colors.
2. **Tailwind tokens** in `tailwind.config.js` — map to either CSS vars (mode-aware) or hard-coded hex (static).

Dark mode is controlled by the `html.dark` class (set by the theme toggle). Because Tailwind tokens reference CSS vars, there is no need for `dark:` class variants on semantic colors — they switch automatically.

---

## Color Tokens

### Semantic (mode-aware)

These change between light and dark mode. Always prefer these over static colors for any surface, text, or border that appears in both modes.

| Token | Light | Dark | Usage |
|---|---|---|---|
| `bg-surface` | `#F5F1E8` | `#2C2C2C` | Page background |
| `bg-surface-raised` | `#EDE5D4` | `#363230` | Elevated cards, panels |
| `bg-chrome` | `#E8E6E1` | `#242220` | Sidebar, tab bar, status bar |
| `bg-overlay` | `#F5F1E8` | `#363230` | Modals, popovers |
| `bg-input-bg` | `#FAF8F3` | `#2C2C2C` | Form inputs |
| `border-edge` | `#D4C4A8` | `#4A4440` | Visible borders |
| `border-edge-subtle` | `rgba(212,196,168,0.35)` | `rgba(74,68,64,0.35)` | Hairline / ghost borders |
| `text-fg` | `#3A3226` | `#E8E4DC` | Primary text |
| `text-fg-muted` | `#6B6B6B` | `#A8A098` | Secondary / supporting text |
| `text-fg-faint` | `#716E66` | `#979290` | Placeholder, tertiary labels |

**Source:** `app/globals.scss` `:root` and `html.dark` blocks.

### Static (same in both modes)

These do not respond to theme changes. Use them when you explicitly need a fixed color regardless of mode, or for brand/accent elements.

| Token | Hex | Usage |
|---|---|---|
| `stone` | `#A8A098` | Static warm gray; non-text decorative elements |
| `clay` | `#4A4440` | Dark surfaces, interactive borders |
| `sage` | `#647558` | Brand green — **text-safe** (4.5:1 on light) |
| `sage-subtle` | `#8B9B7E` | Sage for non-text use only (rings, bg dots, borders) |
| `sage-light` | `#B5C4AC` | Pale sage; backgrounds, selection highlight |
| `sage-dark` | `#6B7A62` | Deeper sage; hover states |
| `accent` | `#C89B6F` | Warm amber accent |
| `accent-hover` | `#B88A5E` | Amber hover state |
| `beige` | `#D4C4A8` | Warm neutral border / decorative |
| `beige-light` | `#EDE5D4` | Table headers, subtle fills |
| `paper-light` | `#F5F1E8` | Explicit light-mode bg alias |
| `paper-softgray` | `#E8E6E1` | Alternate light surface |
| `paper-dark` | `#2C2C2C` | Explicit dark-mode bg alias |
| `paper-dark-surface` | `#363230` | Explicit dark raised surface alias |
| `ink-light` | `#3A3226` | Explicit light-mode text alias |
| `ink-dark` | `#E8E4DC` | Explicit dark-mode text alias |
| `ink-muted` | `#6B6B6B` | Static muted text |
| `ink-hover` | `#4A3E32` | Primary button hover text |

**Source:** `tailwind.config.js` `theme.extend.colors`.

---

## Accessibility (WCAG AA)

Minimum contrast ratios per WCAG 2.1:
- **4.5:1** — normal text, placeholder text, icon labels
- **3:1** — large text (18px+ regular, 14px+ bold), UI component boundaries (focus rings, button borders)

### Verified ratios

| Pair | Light ratio | Dark ratio | Level |
|---|---|---|---|
| `text-fg` on `bg-surface` | 11.2:1 | 11.0:1 | AAA |
| `text-fg-muted` on `bg-surface` | 4.7:1 | 5.4:1 | AA |
| `text-fg-faint` on `bg-surface` | 4.7:1 | 4.6:1 | AA |
| `text-sage` on `bg-surface` | 4.5:1 | — | AA |
| `text-sage` on `bg-chrome` | ~4.3:1 | — | AA (large text) |

### Rules for `fg-faint`

`text-fg-faint` is intentionally the lightest accessible foreground. Use it for:
- Input placeholder text
- Disabled state labels
- Timestamps, word counts, and other tertiary metadata

Do not use it for anything considered decorative-only (icon fills, rule lines) — use `border-edge-subtle` or opacity variants instead.

### Rules for `sage`

`text-sage` (`sage.DEFAULT`, `#647558`) is text-safe on both `bg-surface` and `bg-chrome` in light mode and on all dark surfaces.

`sage-subtle` (`#8B9B7E`) **fails AA for text** (2.6:1 on light surface). Restrict it to:
- Focus rings: `focus-visible:ring-sage-subtle/20`
- Background dots / status indicators: `bg-sage-subtle`
- Borders: `border-sage-subtle/40`

Never use `text-sage-subtle` on a light background.

### Rules for `stone`

`stone` (`#A8A098`) has a 2.3:1 ratio on light surface — **not text-safe**. It is intended for decorative borders and dividers only, never for readable text.

---

## How to Change a Color

### Changing a semantic color (mode-aware)

Edit `app/globals.scss`:

```scss
:root {
  --fg-faint: #716E66; /* ← change light-mode value here */
}

html.dark {
  --fg-faint: #979290; /* ← change dark-mode value here */
}
```

The Tailwind token (`text-fg-faint`) picks up the new value automatically — no Tailwind config change needed.

**Always update both `:root` and `html.dark` when changing a semantic token.**

### Changing a static color

Edit `tailwind.config.js`:

```js
sage: {
  DEFAULT: '#647558', // ← text-safe value
  subtle:  '#8B9B7E', // ← decorative only
  ...
}
```

After editing `tailwind.config.js`, restart the dev server so Tailwind rebuilds the utility classes.

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

Defined in `tailwind.config.js` as custom `fontSize` entries. All sizes follow an Apple HIG-inspired scale:

| Token | Size | Line height | Use |
|---|---|---|---|
| `text-ui-title-1` | 28px | 36px | Page / modal headings |
| `text-ui-title-2` | 22px | 28px | Section headings |
| `text-ui-title-3` | 20px | 26px | Card / panel headings |
| `text-ui-body` | 17px | 24px | Body copy |
| `text-ui-callout` | 16px | 22px | Callouts, descriptions |
| `text-ui-subhead` | 15px | 20px | Labels, nav items |
| `text-ui-footnote` | 13px | 18px | Buttons, badges, captions |
| `text-ui-caption` | 12px | 16px | Timestamps, metadata |
| `text-ui-micro` | 11px | 14px | Tiny labels, tooltips |

---

## Font Families

| Token | Stack | Use |
|---|---|---|
| `font-sans` | SF Pro → Inter → system-ui | UI chrome, labels, buttons |
| `font-serif` | New York → Georgia → serif | Marketing pages |
| `font-mono` | SF Mono → Menlo → monospace | Code spans, inline code |
| `font-sourcecode` | Source Code Pro | Editor code blocks |
| `font-journal` | Georgia | Document body (journal mode) |

---

## Dark Mode

Dark mode is toggled by adding/removing the `dark` class on `<html>`. The implementation deliberately avoids `dark:` Tailwind variants for semantic colors — the CSS var layer handles it.

Use `dark:` prefixes only when:
- A **static** color needs a different value in dark mode (e.g., `dark:bg-paper-dark`)
- An opacity or structural tweak is mode-specific (e.g., `dark:opacity-80`)

Never use `dark:text-fg` or `dark:bg-surface` — they are redundant since those tokens already switch.

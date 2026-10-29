# PageHelpLink

Description: The small (?) at the top right of every /editor page except the editor itself, in [ShellPage](ShellPage.md)'s title bar just before the `SearchPill`: a link to that page's section of the documentation (`/documentation#<section>`), with what the section explains as its tooltip and in its accessible name ("Help: How to use the Tasks page"). A quiet icon at the bar's control size (32px, 44px on touch), the fill on hover.

| Page | Section |
|---|---|
| All Files, Trash | `organizing-files` |
| Tags | `tags-page` |
| Tasks | `tasks-page` |
| Templates | `templates-page` |
| Replace in Files | `command-palette` |
| Settings | `settings` |

## Local State & Storage
- State: None.
- Persistence: None.

## Dependencies
- Core: `TextLink` (`unstyled`), `Tooltip`, `react-icons/hi`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import PageHelpLink from "@/app/editor/components/PageHelpLink";

<PageHelpLink href="/documentation#tasks-page" label="How to use the Tasks page" />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| href | `string` | | The page's section of the documentation |
| label | `string` | | What the section explains: the tooltip, after "Help: " in the link's name |

# DatePickerCallout

A custom calendar and date picker component designed for surgical date replacement within the editor.

## Features

- **Format Awareness**: Handles ISO (`YYYY-MM-DD`), Wiki (`[[YYYY-MM-DD]]`), Slashed (`MM/DD/YYYY`), and Dotted (`DD.MM.YYYY`) formats.
- **Keyboard Navigation**: Supports arrow keys for navigating days, and Enter for selection.
- **Relative Actions**: Quick shortcuts for "Today", "Tomorrow", "+1 Week", and "+1 Month".
- **Responsive**: Adapts layout for mobile (full-width modal style) vs desktop (floating callout).

## Key Props

- `initialDate`: The date to focus when opened.
- `onSelectDate`: Callback receiving the new `Date` object.
- `onClose`: Callback to dismiss the callout.

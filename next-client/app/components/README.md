# UI Components

This directory contains the foundational design system components for HermesMarkdown.

## Primary Components

### Button (`/Button`)
- Polymorphic button supporting various variants (`primary`, `secondary`, `ghost`, `danger`).
- Built-in loading states and icon support.

### Input (`/Input`)
- Styled input fields with validation and focus state management.

### DialogModal (`/DialogModal`)
- Accessible modal system using Headless UI or custom Portal implementation.
- Supports nested modals and various sizing options.

### Toggle (`/Toggle`)
- Accessible switch component for boolean settings.

## Usage Guidelines

- **Consistency**: Always use these components instead of raw HTML to maintain the design system.
- **Theming**: All components are dark-mode compatible via Tailwind's `dark:` classes.

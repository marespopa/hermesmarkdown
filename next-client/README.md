# HermesMarkdown Components

This is the documentation index for the major components of HermesMarkdown.

## Core Modules

- **[Editor Components](./app/editor/components/README.md)**: The heart of the application, including the markdown editor, file sidebar, and date picker.
- **[UI Components](./app/components/README.md)**: Reusable atomic components like Buttons, Inputs, and Modals.

## Key Architectures

- **State Management**: Uses [Jotai](https://jotai.org/) for atomic, distributed state. See `app/atoms/atoms.ts`.
- **File System**: Utilizes the native [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) for local file management.
- **Styling**: Primarily Vanilla CSS with Tailwind utility classes for layout and responsiveness.

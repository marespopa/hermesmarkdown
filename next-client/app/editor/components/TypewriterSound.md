# TypewriterSound

Headless component, mounted once in `EditorShell`, that plays a typewriter click for each key typed in a note.

## Local State & Storage
- Reads `atom_typewriterSound` (`ui-atoms.ts`, `localStorage["typewriterSound"]`, on by default). Turn it off in Settings → Editor → Writing → **Typewriter Sound**, or with the palette's **Enable/Disable Typewriter Sound**.
- Makes the sound engine only while the setting is on, and closes it (and its audio context) when it's turned off or the shell unmounts. Nothing audio-related runs on load: the audio context is made on the first key.

## Behavior
- Listens for `keydown` on the document and sounds only when the target is inside `.cm-content`, so typing in a dialog, the search field or the title stays quiet.
- Which keys sound, and how, is `typewriterKind` (`app/utils/typewriter-sound.ts`): characters, Space, Enter (a carriage return: a slide and a clunk) and Backspace/Delete. Shortcuts, IME composition, navigation and modifier keys are silent. Auto-repeat is ignored except for deleting.
- The sound itself is synthesised on the Web Audio API (`createTypewriterSound`), so there are no audio files and it works offline; each click varies a little, and a held key gives one click per 25 ms.

## Dependencies
`app/utils/typewriter-sound.ts`, `atom_typewriterSound`.

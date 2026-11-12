# TypewriterSound

Headless component, mounted once in `EditorShell`, that plays a typewriter click for each key typed in a note.

## Local State & Storage
- Reads `atom_typewriterSound` (`ui-atoms.ts`, `localStorage["typewriterSound"]`, on by default) and `atom_typewriterVolume` (`localStorage["typewriterVolume"]`: `quiet`, `normal` (the default) or `loud`). Settings → Editor → Writing → **Typewriter Sound** shows the two as one choice (Off, Quiet, Normal, Loud; `atom_typewriterLevel`), and so do the palette's **Typewriter Sound: …** commands. **Enable/Disable Typewriter Sound** flips the switch alone, so turning it on returns to the volume last chosen.
- A change of volume calls the engine's `setVolume` (the master gain, `TYPEWRITER_GAIN`); the engine and its audio context are kept.
- Makes the sound engine only while the setting is on, and closes it (and its audio context) when it's turned off or the shell unmounts. Nothing audio-related runs on load: the audio context is made on the first key.

## Behavior
- Listens on the document and sounds only when the target is inside `.cm-content`, so typing in a dialog, the search field or the title stays quiet.
- **Hardware keyboard:** heard from `keydown`. Which keys sound, and how, is `typewriterKind` (`app/utils/typewriter-sound.ts`): characters, Space, Enter (a carriage return: a slide and a clunk) and Backspace/Delete. Shortcuts, navigation and modifier keys are silent. Auto-repeat is ignored except for deleting.
- **On-screen keyboard (phones, tablets) and IMEs:** their keydowns don't name the key (`typewriterKeyNamed` is false), or don't come at all when swiping, so the typing is heard from `beforeinput` through `typewriterInputKind`: `insertText` and `insertCompositionText` (by the last character), `insertLineBreak`/`insertParagraph`, and `deleteContentBackward`/`deleteContentForward`. The composition's text so far is kept (reset on `compositionend`) so a composition that got shorter sounds as a delete and the unchanged commit at the end of a word is silent. Paste, cut, drop and undo are silent.
- One click per key: a `beforeinput` within 50 ms of a named keydown is skipped, since that keydown already sounded or chose silence (a shortcut, a repeat). Keydown stays the source for a hardware keyboard because the editor's keymap cancels the input of Enter and Backspace.
- The sound itself is synthesised on the Web Audio API (`createTypewriterSound`), so there are no audio files and it works offline; each click varies a little, and a held key gives one click per 25 ms. A phone's silent switch or media volume mutes it like any other page audio.

## Dependencies
`app/utils/typewriter-sound.ts`, `atom_typewriterSound`, `atom_typewriterVolume`.

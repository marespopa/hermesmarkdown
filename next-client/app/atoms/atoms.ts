import { WritableAtom, atom, createStore } from "jotai";
import { RESET, atomWithStorage } from "jotai/utils";
import { getAtomStorage } from "@/app/services/storage/atomStorage";

export const contentStore = createStore();

// Theme & appearance
export const atom_theme = atomWithStorage<"light" | "dark">("theme", "light");
export const atom_fontFamily = atomWithStorage<string>(
  "editorFontFamily",
  "Fira Mono, monospace",
);
export const atom_fontSize = atomWithStorage<string>(
  "editorFontSize",
  "prose-base",
);

type ContentAtom = WritableAtom<
  string,
  [SetStateActionWithReset<string>],
  void
>;
export const atom_content = atomWithStorage("content", "") as ContentAtom;

import type { IconType } from "react-icons";
import {
  LuArchive, LuBookOpen, LuBookmark, LuBriefcase, LuCalendar, LuCamera, LuCode, LuCoffee, LuFlag, LuFolder,
  LuGlobe, LuHeart, LuLightbulb, LuMusic, LuPencil, LuPlane, LuRocket, LuStar, LuWallet,
} from "react-icons/lu";
import { normalizeTag } from "@/app/utils/tag-normalize";

// The icons a tag can take in the vault's `.hermes/tags.json`, by Lucide
// name. A name matches however it's spelled (`BookOpen`, `book-open`).
const ICONS: Record<string, IconType> = {
  archive: LuArchive, bookopen: LuBookOpen, bookmark: LuBookmark, briefcase: LuBriefcase, calendar: LuCalendar,
  camera: LuCamera, code: LuCode, coffee: LuCoffee, flag: LuFlag, folder: LuFolder, globe: LuGlobe, heart: LuHeart,
  lightbulb: LuLightbulb, music: LuMusic, pencil: LuPencil, plane: LuPlane, rocket: LuRocket, star: LuStar, wallet: LuWallet,
};

export const TAGS_CONFIG_DIR = ".hermes";
export const TAGS_CONFIG_FILE = "tags.json";

export type TagIcons = Record<string, IconType>;

// `{ "journal": "BookOpen", "#work/projects": "Briefcase" }` as icons by
// normalized tag. Anything that isn't a known icon name is left out, and
// text that isn't such an object gives none.
export function parseTagIcons(text: string): TagIcons {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return {};
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const icons: TagIcons = {};
  for (const [tag, name] of Object.entries(raw)) {
    const icon = typeof name === "string" ? ICONS[name.toLowerCase().replace(/[^a-z]/g, "")] : undefined;
    const key = normalizeTag(tag);
    if (icon && key) icons[key] = icon;
  }
  return icons;
}

// The vault's tag icons; none when the file is missing or unreadable.
export async function readTagIcons(vault: FileSystemDirectoryHandle): Promise<TagIcons> {
  try {
    const dir = await vault.getDirectoryHandle(TAGS_CONFIG_DIR);
    const file = await (await dir.getFileHandle(TAGS_CONFIG_FILE)).getFile();
    return parseTagIcons(await file.text());
  } catch {
    return {};
  }
}

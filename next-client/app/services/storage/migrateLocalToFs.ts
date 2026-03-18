const MIGRATION_FLAG_KEY = "__hermes_fs_migrated_v1__";

const PILOT_KEYS = ["theme", "files", "selectedFileId"] as const;

const hasWindow = () => typeof window !== "undefined";

const safeJsonParse = <T>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const migrateLocalStorageKeysOnce = async (
  writer: (key: string, value: unknown) => Promise<void>,
): Promise<void> => {
  if (!hasWindow()) return;

  if (localStorage.getItem(MIGRATION_FLAG_KEY) === "true") return;

  for (const key of PILOT_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;

    const parsed = safeJsonParse<unknown>(raw);
    if (parsed === null) continue;

    await writer(key, parsed);
  }

  localStorage.setItem(MIGRATION_FLAG_KEY, "true");
};

export const migrationMeta = {
  pilotKeys: PILOT_KEYS,
  flagKey: MIGRATION_FLAG_KEY,
};


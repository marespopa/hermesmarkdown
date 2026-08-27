export const formatDateToken = (date: Date, kind: "iso" | "due" = "iso"): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const iso = `${year}-${month}-${day}`;
  return kind === "due" ? `@due(${iso})` : iso;
};

export const parseDateToken = (value: string): Date | null => {
  const normalized = value.trim();
  if (!normalized) return null;

  const compact = normalized.replace(/^@due\(/, "").replace(/\)$/, "").replace(/^@/, "");
  const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(compact);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
};

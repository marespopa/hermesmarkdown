import type { AutocompleteGroup, AutocompleteItem } from "./types";

type PromptTemplate = {
  key: string;
  label: string;
  description: string;
  template: string;
  category?: string;
};

type AutocompleteData = {
  flatItems: AutocompleteItem[];
  groupedItems: AutocompleteGroup[];
};

export const buildAutocompleteData = (
  prompt: string,
  cursorPosition: number,
  templates: PromptTemplate[]
): AutocompleteData => {
  const lineStart = prompt.lastIndexOf("\n", cursorPosition - 1);
  const tokenStart = prompt.lastIndexOf("/", cursorPosition - 1);
  const isTokenValid = tokenStart === lineStart + 1;
  const token = isTokenValid ? prompt.slice(tokenStart, cursorPosition).toLowerCase() : "";

  if (!isTokenValid) {
    return {
      flatItems: [],
      groupedItems: [],
    };
  }

  const templateItems: AutocompleteItem[] = templates.map((entry) => ({
    key: entry.key,
    category: entry.category ?? "Other",
    label: `${entry.key} - ${entry.label}`,
    description: entry.description,
    template: entry.template,
  }));

  const filtered = templateItems.filter((entry) => {
    if (token.length === 0) {
      return true;
    }
    const haystack = `${entry.label} ${entry.description}`.toLowerCase();
    return haystack.includes(token);
  });

  const groupedMap = new Map<string, AutocompleteItem[]>();
  const groupedOrder: string[] = [];
  filtered.forEach((entry) => {
    if (!groupedMap.has(entry.category)) {
      groupedMap.set(entry.category, []);
      groupedOrder.push(entry.category);
    }
    groupedMap.get(entry.category)?.push(entry);
  });

  const groupedItems: AutocompleteGroup[] = groupedOrder.map((category) => ({
    category,
    items: groupedMap.get(category) ?? [],
  }));

  return {
    flatItems: filtered,
    groupedItems,
  };
};

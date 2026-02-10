export type AutocompleteItem = {
  key: string;
  category: string;
  label: string;
  description: string;
  template: string;
};

export type AutocompleteGroup = {
  category: string;
  items: AutocompleteItem[];
};

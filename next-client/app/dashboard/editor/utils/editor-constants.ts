type OpenFilePickerOptions = {
  types?: { description: string; accept: Record<string, string[]> }[];
  excludeAcceptAllOption?: boolean;
  multiple?: boolean;
};

export const EMPTY_PAGE_TEMPLATE = "";

export const PICKER_OPTIONS: OpenFilePickerOptions = {
  types: [
    {
      description: "MD Files",
      accept: {
        "text/markdown": [".md", ".txt"],
      },
    },
  ],
  excludeAcceptAllOption: true,
  multiple: false,
};

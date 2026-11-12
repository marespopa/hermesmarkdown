// Attributes for every text field: the app has no logins, addresses or cards
// to fill, so browsers and password-manager extensions are told to leave its
// fields alone. Each extension reads its own opt-out, hence the list.
export const NO_AUTOFILL = {
  autoComplete: "off",
  "data-form-type": "other",
  "data-lpignore": "true",
  "data-1p-ignore": "true",
  "data-bwignore": "true",
} as const;

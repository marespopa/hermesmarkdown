import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { DEFAULT_PRINT_SETTINGS, normalizePrintSettings, type PrintSettings } from "@/app/utils/print/print-settings";

// Export as PDF's page setup, chosen in its dialog and kept for the next export.
const atom_pdfSettingsStored = atomWithStorage<unknown>("hermes_pdf_settings", DEFAULT_PRINT_SETTINGS);
export const atom_pdfSettings = atom(
  (get) => normalizePrintSettings(get(atom_pdfSettingsStored)),
  (_get, set, settings: PrintSettings) => set(atom_pdfSettingsStored, settings),
);

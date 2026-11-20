import type * as PdfJs from "pdfjs-dist";

// PDF.js, loaded the first time a PDF is opened (its own chunk, so nothing is
// downloaded for people who never open one), with its worker started once.
let loading: Promise<typeof PdfJs> | null = null;

export function loadPdfJs(): Promise<typeof PdfJs> {
  loading ??= import("pdfjs-dist")
    .then((pdfjs) => {
      if (!pdfjs.GlobalWorkerOptions.workerPort) {
        pdfjs.GlobalWorkerOptions.workerPort = new Worker(new URL("../../workers/pdf.worker.ts", import.meta.url), { type: "module" });
      }
      return pdfjs;
    })
    .catch((error: unknown) => {
      // A failed chunk load (offline before it was cached) can be retried.
      loading = null;
      throw error;
    });
  return loading;
}

/** Whether PDF.js refused the file because it needs a password. */
export function isPasswordError(error: unknown): boolean {
  return !!error && typeof error === "object" && (error as { name?: string }).name === "PasswordException";
}

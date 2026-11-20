import { act, fireEvent, render, screen } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { atom_vaultHandle } from "@/app/atoms/atoms";
import PdfViewer from "./PdfViewer";

const pdf = vi.hoisted(() => ({
  getDocument: vi.fn(),
  destroy: vi.fn(() => Promise.resolve()),
  render: vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() })),
}));

vi.mock("@/app/atoms/vault-atoms", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/atoms/vault-atoms")>()),
  resolveFileHandleAtPath: vi.fn(async () => ({
    getFile: async () => ({ arrayBuffer: async () => new ArrayBuffer(8) }),
  })),
}));

vi.mock("../utils/pdfjs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../utils/pdfjs")>()),
  loadPdfJs: async () => ({
    getDocument: pdf.getDocument,
    TextLayer: class {
      render() {
        return Promise.resolve();
      }
      cancel() {}
    },
  }),
}));

function documentWith(pages: number) {
  const page = {
    getViewport: ({ scale }: { scale: number }) => ({ width: 600 * scale, height: 800 * scale }),
    render: pdf.render,
    streamTextContent: () => ({}),
  };
  return {
    promise: Promise.resolve({ numPages: pages, getPage: async () => page }),
    destroy: pdf.destroy,
  };
}

async function open(path = "papers/Report.pdf") {
  const store = createStore();
  store.set(atom_vaultHandle, {} as FileSystemDirectoryHandle);
  const view = render(
    <Provider store={store}>
      <PdfViewer path={path} />
    </Provider>,
  );
  await act(async () => {});
  return view;
}

describe("PdfViewer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows every page of the PDF, sized and drawn, with the page in view", async () => {
    pdf.getDocument.mockReturnValue(documentWith(3));
    await open();

    expect(screen.getByRole("document", { name: "Report.pdf" })).toBeInTheDocument();
    expect(screen.getAllByRole("group", { name: /^Page \d$/ })).toHaveLength(3);
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(pdf.render).toHaveBeenCalledTimes(3);
  });

  it("zooms with the bar and with Ctrl/Cmd +, − and 0", async () => {
    pdf.getDocument.mockReturnValue(documentWith(1));
    await open();
    const fit = screen.getByRole("button", { name: "Fit to width" });

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(fit).toHaveTextContent("110%");
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    expect(fit).toHaveTextContent("90%");

    const doc = screen.getByRole("document");
    fireEvent.keyDown(doc, { key: "=", ctrlKey: true });
    expect(fit).toHaveTextContent("100%");
    fireEvent.keyDown(doc, { key: "=", metaKey: true });
    const reset = fireEvent.keyDown(doc, { key: "0", ctrlKey: true });
    expect(fit).toHaveTextContent("100%");
    // Handled here, so the browser's zoom and the sidebar's Ctrl/Cmd+0 stay out of it.
    expect(reset).toBe(false);
  });

  it("says when a PDF needs a password", async () => {
    pdf.getDocument.mockReturnValue({
      promise: Promise.reject(Object.assign(new Error("needs a password"), { name: "PasswordException" })),
      destroy: pdf.destroy,
    });
    await open();

    expect(screen.getByRole("alert")).toHaveTextContent("protected by a password");
  });

  it("says when a PDF can't be read, and frees the document on close", async () => {
    pdf.getDocument.mockReturnValue({ promise: Promise.reject(new Error("broken")), destroy: pdf.destroy });
    const { unmount } = await open();

    expect(screen.getByRole("alert")).toHaveTextContent("This PDF can't be shown.");
    unmount();
    expect(pdf.destroy).toHaveBeenCalled();
  });
});

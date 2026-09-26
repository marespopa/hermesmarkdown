import { fireEvent, render, screen } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { atom_openFiles } from "@/app/atoms/file-atoms";
import { atom_userName } from "@/app/atoms/ui-atoms";
import LandingPage from "./LandingPage";

const router = vi.hoisted(() => ({
  push: vi.fn(),
  prefetch: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

function renderLandingPage({
  draftContent = "",
  userName = "",
}: {
  draftContent?: string;
  userName?: string;
} = {}) {
  const store = createStore();
  store.set(atom_openFiles, {
    draft: {
      content: draftContent,
      lastSavedContent: "",
      fileName: "untitled",
      activeFilePath: null,
    },
  });
  store.set(atom_userName, userName);

  render(
    <Provider store={store}>
      <LandingPage />
    </Provider>,
  );

  return store;
}

describe("LandingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a concise introduction with editor and documentation actions", () => {
    renderLandingPage();

    expect(
      screen.getByRole("heading", {
        name: "A place where all you can do is write.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open a Local Folder & Write" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Read the docs/ })).toHaveAttribute(
      "href",
      "/documentation",
    );
    expect(screen.queryByText("Try it. Right here.")).not.toBeInTheDocument();
    expect(screen.queryByText("Optional GitHub backup, on your terms")).not.toBeInTheDocument();
  });

  it("opens the editor from the primary action", () => {
    renderLandingPage();

    fireEvent.click(
      screen.getByRole("button", { name: "Open a Local Folder & Write" }),
    );

    expect(router.push).toHaveBeenCalledWith("/editor");
    expect(screen.getByRole("alert")).toHaveTextContent("Opening editor...");
  });

  it("lets a returning user name themselves before resuming a draft", async () => {
    const store = renderLandingPage({ draftContent: "# Draft" });

    expect(await screen.findByRole("status")).toHaveTextContent("Welcome Back");
    fireEvent.change(screen.getByPlaceholderText("What should we call you?"), {
      target: { value: "Ada" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));

    expect(store.get(atom_userName)).toBe("Ada");
    expect(router.push).toHaveBeenCalledWith("/editor");
  });
});

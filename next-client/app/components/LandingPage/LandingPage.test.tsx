import { fireEvent, render, screen } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { atom_openFiles } from "@/app/atoms/file-atoms";
import { atom_userName } from "@/app/atoms/ui-atoms";
import LandingPage from "./LandingPage";
import { LANDING_FAQ } from "./landing-content";

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
      screen.getByRole("button", { name: "Start Writing" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Read the docs/ })).toHaveAttribute(
      "href",
      "/documentation",
    );
    expect(screen.queryByText("Try it. Right here.")).not.toBeInTheDocument();
    expect(screen.queryByText("Optional GitHub backup, on your terms")).not.toBeInTheDocument();
  });

  it("explains the editor below the hero, with an FAQ and links to the guides", () => {
    renderLandingPage();

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "A local-first Markdown editor in your browser",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Works offline" })).toBeInTheDocument();
    for (const { q, a } of LANDING_FAQ) {
      expect(screen.getByText(q)).toBeInTheDocument();
      expect(screen.getByText(a)).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "what a Markdown editor is" })).toHaveAttribute(
      "href",
      "/markdown-editor",
    );
    expect(screen.getByRole("link", { name: "free Markdown tools" })).toHaveAttribute(
      "href",
      "/tools",
    );
  });

  it("opens the editor from the primary action", () => {
    renderLandingPage();

    fireEvent.click(
      screen.getByRole("button", { name: "Start Writing" }),
    );

    expect(router.push).toHaveBeenCalledWith("/editor");
    expect(screen.getByRole("alert")).toHaveTextContent("Opening editor...");
  });

  it("offers Resume to a returning user with a name, without focusing it", async () => {
    renderLandingPage({ draftContent: "# Draft", userName: "Writer" });

    expect(await screen.findByRole("status")).toHaveTextContent("Welcome back, Writer");
    // A plain button: focused on show, it drew its focus ring at once.
    expect(screen.getByRole("button", { name: "Resume" })).not.toHaveFocus();
  });

  it("lets a returning user name themselves before resuming a draft", async () => {
    const store = renderLandingPage({ draftContent: "# Draft" });

    expect(await screen.findByRole("status")).toHaveTextContent("Welcome Back");
    fireEvent.change(screen.getByPlaceholderText("What should we call you?"), {
      target: { value: "Writer" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));

    expect(store.get(atom_userName)).toBe("Writer");
    expect(router.push).toHaveBeenCalledWith("/editor");
  });

});

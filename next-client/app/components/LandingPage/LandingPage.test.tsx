import { fireEvent, render, screen } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { atom_openFiles } from "@/app/atoms/file-atoms";
import { atom_userName } from "@/app/atoms/ui-atoms";
import LandingPage from "./LandingPage";
import { LANDING_FAQ, LANDING_FEATURES, LANDING_FILES, LANDING_HEADLINE, LANDING_SPECS } from "./landing-content";

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

  it("opens with one headline, one line, one call to action and a docs link", () => {
    renderLandingPage();

    expect(screen.getByRole("heading", { level: 1, name: LANDING_HEADLINE })).toBeInTheDocument();
    expect(screen.getByText("HermesMarkdown", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Read the docs/ })).toHaveAttribute("href", "/documentation");
    // The hero's call to action only; the floating one is hidden and inert.
    expect(screen.getAllByRole("button", { name: "Start writing" })).toHaveLength(1);
  });

  it("says the headline again at the close, without a second button", () => {
    renderLandingPage();

    const close = screen.getByRole("heading", { level: 2, name: LANDING_HEADLINE }).closest("section");
    expect(close?.querySelector("button")).toBeNull();
  });

  it("makes the privacy promise once, with its AI limit and a link to the specs", () => {
    renderLandingPage();

    expect(document.body.textContent?.match(/No account/g)).toHaveLength(1);
    expect(screen.getByText(/Unless you turn on AI/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See the specs" })).toHaveAttribute("href", "#specs");
  });

  it("gives each feature and the files their own chapter, with a demo", async () => {
    renderLandingPage();

    for (const feature of [...LANDING_FEATURES, LANDING_FILES]) {
      expect(screen.getByRole("heading", { level: 2, name: feature.title })).toBeInTheDocument();
      expect(screen.getByText(feature.eyebrow, { selector: "p" })).toBeInTheDocument();
    }
    expect(await screen.findByRole("img", { name: /command palette/ })).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: /table being edited/ })).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: /drawn diagram/ })).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: /Focus mode/ })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /folder of notes, code and images/ })).toBeInTheDocument();
  });

  it("shows the typing loop in the hero only, with no embed", () => {
    const { container } = render(
      <Provider store={createStore()}>
        <LandingPage />
      </Provider>,
    );

    expect(screen.getByRole("img", { name: /note being typed/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Make it yours." })).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /note being typed/ })).toHaveLength(1);
    expect(container.querySelector("iframe, video")).toBeNull();
  });

  it("lists every spec once, in the specs section", () => {
    renderLandingPage();

    const specs = document.getElementById("specs");
    expect(specs).not.toBeNull();
    for (const { label, value } of LANDING_SPECS) {
      expect(screen.getByText(label, { selector: "dt" })).toBeInTheDocument();
      expect(screen.getByText(value)).toBeInTheDocument();
    }
    expect(screen.getByText(/Chrome and Edge on a computer: a folder on your disk/)).toBeInTheDocument();
  });

  it("folds each FAQ answer under its question, and links to the guides", () => {
    const { container } = render(
      <Provider store={createStore()}>
        <LandingPage />
      </Provider>,
    );

    const details = container.querySelectorAll("details");
    expect(details).toHaveLength(LANDING_FAQ.length);
    expect(LANDING_FAQ.length).toBeLessThanOrEqual(5);
    details.forEach((item) => expect(item).not.toHaveAttribute("open"));
    for (const { q } of LANDING_FAQ) expect(screen.getByText(q)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "what a Markdown editor is" })).toHaveAttribute("href", "/markdown-editor");
    expect(screen.getByRole("link", { name: "free Markdown tools" })).toHaveAttribute("href", "/tools");
  });

  it("opens the editor from the primary action", () => {
    renderLandingPage();

    fireEvent.click(
      screen.getAllByRole("button", { name: "Start writing" })[0],
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

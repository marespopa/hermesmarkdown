import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Provider, useAtomValue } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import WelcomeWizard from "./WelcomeWizard";
import { atom_renderedFontSize } from "@/app/atoms/atoms";
import { atom_flowMode, atom_hasCompletedOnboarding, atom_homeFeedOpen, atom_isWizardOpen, atom_sidebarOpen, atom_toolbarDisplayMode, atom_userName } from "@/app/atoms/ui-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { testAIConnection } from "@/app/services/ai";

// Mock hooks
vi.mock("@/app/hooks/use-file-system", () => ({
  useFileSystem: vi.fn(),
}));

vi.mock("@/app/services/ai", () => ({
  testAIConnection: vi.fn(),
}));

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const HydrateAtoms = ({ initialValues, children }: { initialValues: any, children: React.ReactNode }) => {
  useHydrateAtoms(initialValues);
  return children;
};

const TestProvider = ({ initialValues, children }: { initialValues: any, children: React.ReactNode }) => (
  <Provider>
    <HydrateAtoms initialValues={initialValues}>{children}</HydrateAtoms>
  </Provider>
);

const FontSizeValue = () => (
  <output data-testid="font-size-value">{useAtomValue(atom_renderedFontSize)}</output>
);

const SidebarValue = () => (
  <output data-testid="sidebar-value">{String(useAtomValue(atom_sidebarOpen))}</output>
);

const ToolbarStyleValue = () => (
  <output data-testid="toolbar-style-value">{useAtomValue(atom_toolbarDisplayMode)}</output>
);

const FlowModeValue = () => (
  <output data-testid="flow-mode-value">{String(useAtomValue(atom_flowMode))}</output>
);

const UserNameValue = () => (
  <output data-testid="user-name-value">{useAtomValue(atom_userName)}</output>
);

const HomeFeedValue = () => (
  <output data-testid="home-feed-value">{String(useAtomValue(atom_homeFeedOpen))}</output>
);

describe("WelcomeWizard", () => {
  const mockOpenVault = vi.fn();

  const defaultInitialValues: any = [
    [atom_hasCompletedOnboarding, false],
    [atom_isWizardOpen, true],
    [atom_vaultHandle, null],
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    (useFileSystem as any).mockReturnValue({
      openVault: mockOpenVault,
      isVaultSupported: true,
    });
  });

  it("starts by asking for a name and stores it trimmed", () => {
    render(
      <TestProvider initialValues={defaultInitialValues}>
        <WelcomeWizard />
        <UserNameValue />
      </TestProvider>
    );

    const input = screen.getByRole("textbox", { name: "Your name" });
    fireEvent.change(input, { target: { value: "  Ada  " } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getByTestId("user-name-value")).toHaveTextContent(/^Ada$/);
    expect(screen.getByText("Connect Your Vault")).toBeInTheDocument();
  });

  it("lets the name be skipped", () => {
    render(
      <TestProvider initialValues={defaultInitialValues}>
        <WelcomeWizard />
      </TestProvider>
    );

    fireEvent.click(screen.getByText("Continue"));
    expect(screen.getByText("Connect Your Vault")).toBeInTheDocument();
  });

  it("advances preference steps when Enter is pressed", () => {
    render(
      <TestProvider initialValues={defaultInitialValues}>
        <WelcomeWizard initialStep={2} />
      </TestProvider>
    );

    fireEvent.keyDown(window, { key: "Enter" });

    expect(screen.getByText("Make the editor feel like paper")).toBeInTheDocument();
  });

  it("offers GitHub vault connection during vault setup", () => {
    render(
      <TestProvider initialValues={defaultInitialValues}>
        <WelcomeWizard initialStep={1} />
      </TestProvider>
    );

    expect(screen.getByRole("button", { name: "Connect GitHub Vault" })).toBeInTheDocument();
    expect(screen.getAllByRole("button").slice(-3).map((button) => button.textContent))
      .toEqual(expect.arrayContaining([
        expect.stringContaining("Create New Vault"),
        expect.stringContaining("Open Existing Vault"),
        expect.stringContaining("Connect GitHub Vault"),
      ]));
    expect(screen.getAllByRole("button").at(-1)).toHaveAccessibleName("Connect GitHub Vault");
  });

  it("advances to the theme step automatically if a vault is already connected", async () => {
    const connectedValues = [
      ...defaultInitialValues.filter(([a]: any) => a !== atom_vaultHandle),
      [atom_vaultHandle, { name: "TestVault" }],
    ];

    render(
      <TestProvider initialValues={connectedValues}>
        <WelcomeWizard initialStep={1} />
      </TestProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Theme")).toBeInTheDocument();
    });
  });

  it("shows showcase step when finishing preferences", async () => {
    const connectedValues = [
      ...defaultInitialValues.filter(([a]: any) => a !== atom_vaultHandle),
      [atom_vaultHandle, { name: "TestVault" }],
    ];

    render(
      <TestProvider initialValues={connectedValues}>
        <WelcomeWizard initialStep={2} />
      </TestProvider>
    );

    expect(screen.getByText("Theme")).toBeInTheDocument();

    // Steps 2-10 (Theme, typeface, text size, line numbers, Vim Mode,
    // Flow mode, Autosave, Toolbar style, Sidebar, AI Features) advance one step at a time before the final step.
    for (let i = 0; i < 10; i++) {
      fireEvent.click(screen.getByText("Continue"));
    }

    await waitFor(() => {
      expect(screen.getByText("You're ready to write.")).toBeInTheDocument();
    });
  });

  it("lands on the home feed when the wizard finishes with a vault open", () => {
    const connectedValues = [
      ...defaultInitialValues.filter(([a]: any) => a !== atom_vaultHandle),
      [atom_vaultHandle, { name: "TestVault" }],
    ];

    render(
      <TestProvider initialValues={connectedValues}>
        <WelcomeWizard initialStep={12} />
        <HomeFeedValue />
      </TestProvider>
    );

    expect(screen.getByTestId("home-feed-value")).toHaveTextContent("false");
    fireEvent.click(screen.getByText("Open Editor"));

    expect(screen.getByTestId("home-feed-value")).toHaveTextContent("true");
    expect(screen.queryByText("You're ready to write.")).not.toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("stays in the editor after opening an existing vault", async () => {
    mockOpenVault.mockResolvedValue(true);
    render(
      <TestProvider initialValues={defaultInitialValues}>
        <WelcomeWizard initialStep={1} />
      </TestProvider>
    );

    fireEvent.click(screen.getByText("Open Existing Vault"));

    await waitFor(() => expect(mockOpenVault).toHaveBeenCalled());
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("lets the user choose and saves the rendered text size", () => {
    render(
      <TestProvider initialValues={defaultInitialValues}>
        <WelcomeWizard initialStep={4} />
        <FontSizeValue />
      </TestProvider>
    );

    const fontSize = screen.getByRole("combobox", { name: "Text size" });
    // First-run onboarding starts at Medium.
    expect(fontSize).toHaveValue("16px");

    fireEvent.change(fontSize, { target: { value: "20px" } });

    expect(screen.getByTestId("font-size-value")).toHaveTextContent("20px");
  });

  it("keeps a text size the user already chose", () => {
    window.localStorage.setItem("renderedFontSize", JSON.stringify("20px"));
    render(
      <TestProvider initialValues={[...defaultInitialValues, [atom_renderedFontSize, "20px"]]}>
        <WelcomeWizard initialStep={4} />
        <FontSizeValue />
      </TestProvider>
    );

    expect(screen.getByTestId("font-size-value")).toHaveTextContent("20px");
  });

  it("lets the user turn on flow mode", () => {
    render(
      <TestProvider initialValues={defaultInitialValues}>
        <WelcomeWizard initialStep={7} />
        <FlowModeValue />
      </TestProvider>
    );

    expect(screen.getByText("Write in flow mode?")).toBeInTheDocument();
    expect(screen.getByTestId("flow-mode-value")).toHaveTextContent("false");

    fireEvent.click(screen.getByRole("switch", { name: "Flow mode" }));

    expect(screen.getByTestId("flow-mode-value")).toHaveTextContent("true");
  });

  it("lets the user choose the toolbar style", () => {
    localStorage.removeItem("toolbarDisplayMode");
    render(
      <TestProvider initialValues={defaultInitialValues}>
        <WelcomeWizard initialStep={9} />
        <ToolbarStyleValue />
      </TestProvider>
    );

    expect(screen.getByText("Toolbar style")).toBeInTheDocument();
    expect(screen.getByTestId("toolbar-style-value")).toHaveTextContent("icon");

    fireEvent.click(screen.getByRole("button", { name: "Icon and Text" }));

    expect(screen.getByTestId("toolbar-style-value")).toHaveTextContent("iconAndText");
  });

  it("lets the user turn on the sidebar", () => {
    localStorage.removeItem("sidebarOpen");
    render(
      <TestProvider initialValues={defaultInitialValues}>
        <WelcomeWizard initialStep={10} />
        <SidebarValue />
      </TestProvider>
    );

    expect(screen.getByText("Show the sidebar?")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-value")).toHaveTextContent("false");

    fireEvent.click(screen.getByRole("switch", { name: "Sidebar" }));

    expect(screen.getByTestId("sidebar-value")).toHaveTextContent("true");
  });

  it("replaces the test button with a connection confirmation after success", async () => {
    render(
      <TestProvider initialValues={defaultInitialValues}>
        <WelcomeWizard initialStep={11} />
      </TestProvider>
    );

    fireEvent.change(screen.getByLabelText("welcome-ai-key"), { target: { value: "test-key" } });
    (testAIConnection as any).mockResolvedValue({ success: true });
    fireEvent.click(screen.getByText("Test Connection"));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Connection successful.");
    });
    expect(screen.queryByText("Test Connection")).not.toBeInTheDocument();
  });
});

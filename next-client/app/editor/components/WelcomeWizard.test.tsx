import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Provider, useAtomValue } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import WelcomeWizard from "./WelcomeWizard";
import { atom_renderedFontSize } from "@/app/atoms/atoms";
import { atom_fullWidth, atom_hasCompletedOnboarding, atom_homeFeedOpen, atom_isWizardOpen, atom_welcomeDeferred } from "@/app/atoms/ui-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";

// Mock hooks
vi.mock("@/app/hooks/use-file-system", () => ({
  useFileSystem: vi.fn(),
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

const FullWidthValue = () => (
  <output data-testid="full-width-value">{String(useAtomValue(atom_fullWidth))}</output>
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
  const connectedValues: any = [
    [atom_hasCompletedOnboarding, false],
    [atom_isWizardOpen, true],
    [atom_vaultHandle, { name: "TestVault" }],
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    (useFileSystem as any).mockReturnValue({
      openVault: mockOpenVault,
      isVaultSupported: true,
    });
  });

  it("waits for the next visit when a tool handoff deferred it, unless opened on purpose", () => {
    const { unmount } = render(
      <TestProvider initialValues={[[atom_hasCompletedOnboarding, false], [atom_welcomeDeferred, true], [atom_vaultHandle, null]]}>
        <WelcomeWizard />
      </TestProvider>
    );
    expect(screen.queryByText("Open Existing Vault")).not.toBeInTheDocument();
    unmount();

    render(
      <TestProvider initialValues={[...defaultInitialValues, [atom_welcomeDeferred, true]]}>
        <WelcomeWizard />
      </TestProvider>
    );
    expect(screen.getByText("Open Existing Vault")).toBeInTheDocument();
  });

  it("starts on the vault step, with GitHub among the options", () => {
    render(
      <TestProvider initialValues={defaultInitialValues}>
        <WelcomeWizard />
      </TestProvider>
    );

    expect(screen.queryByRole("textbox", { name: "Your name" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button").slice(-3).map((button) => button.textContent))
      .toEqual(expect.arrayContaining([
        expect.stringContaining("Create New Vault"),
        expect.stringContaining("Open Existing Vault"),
        expect.stringContaining("Connect GitHub Vault"),
      ]));
  });

  it("goes straight to the last step once a vault is connected", async () => {
    render(
      <TestProvider initialValues={connectedValues}>
        <WelcomeWizard />
      </TestProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("You're ready to write.")).toBeInTheDocument();
    });
  });

  it("lands an old, longer tour's saved step on the last step", async () => {
    render(
      <TestProvider initialValues={connectedValues}>
        <WelcomeWizard initialStep={6} />
      </TestProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("You're ready to write.")).toBeInTheDocument();
    });
  });

  it("lands on the home feed when the wizard finishes with a vault open", () => {
    render(
      <TestProvider initialValues={connectedValues}>
        <WelcomeWizard initialStep={1} />
        <HomeFeedValue />
      </TestProvider>
    );

    expect(screen.getByTestId("home-feed-value")).toHaveTextContent("false");
    fireEvent.click(screen.getByText("Open Editor"));

    expect(screen.getByTestId("home-feed-value")).toHaveTextContent("true");
    expect(screen.queryByText("You're ready to write.")).not.toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("finishes with Enter on the last step", () => {
    render(
      <TestProvider initialValues={connectedValues}>
        <WelcomeWizard initialStep={1} />
      </TestProvider>
    );

    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.queryByText("You're ready to write.")).not.toBeInTheDocument();
  });

  it("ignores Enter once finished, so Enter in the editor never opens the home feed", () => {
    render(
      <TestProvider initialValues={[[atom_hasCompletedOnboarding, true], [atom_isWizardOpen, false], [atom_vaultHandle, { name: "TestVault" }]]}>
        <WelcomeWizard initialStep={1} />
        <HomeFeedValue />
      </TestProvider>
    );

    const editor = document.createElement("div");
    editor.contentEditable = "true";
    document.body.appendChild(editor);
    fireEvent.keyDown(editor, { key: "Enter" });

    expect(screen.getByTestId("home-feed-value")).toHaveTextContent("false");
    editor.remove();
  });

  it("keeps a hidden tour on the vault step when a vault connects", () => {
    render(
      <TestProvider initialValues={[[atom_hasCompletedOnboarding, true], [atom_isWizardOpen, false], [atom_vaultHandle, { name: "TestVault" }]]}>
        <WelcomeWizard />
      </TestProvider>
    );

    expect(window.localStorage.getItem("welcomeWizardStep") ?? "0").toBe("0");
  });

  it("lets you skip the vault and just write", () => {
    render(
      <TestProvider initialValues={defaultInitialValues}>
        <WelcomeWizard />
      </TestProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(screen.queryByText("Open Existing Vault")).not.toBeInTheDocument();
  });

  it("stays in the editor after opening an existing vault", async () => {
    mockOpenVault.mockResolvedValue(true);
    render(
      <TestProvider initialValues={defaultInitialValues}>
        <WelcomeWizard />
      </TestProvider>
    );

    fireEvent.click(screen.getByText("Open Existing Vault"));

    await waitFor(() => expect(mockOpenVault).toHaveBeenCalled());
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("starts first-run text at Medium, but keeps a size already chosen", () => {
    const { unmount } = render(
      <TestProvider initialValues={defaultInitialValues}>
        <WelcomeWizard />
        <FontSizeValue />
      </TestProvider>
    );
    expect(screen.getByTestId("font-size-value")).toHaveTextContent("17px");
    unmount();

    window.localStorage.setItem("renderedFontSize", JSON.stringify("21px"));
    render(
      <TestProvider initialValues={[...defaultInitialValues, [atom_renderedFontSize, "21px"]]}>
        <WelcomeWizard />
        <FontSizeValue />
      </TestProvider>
    );
    expect(screen.getByTestId("font-size-value")).toHaveTextContent("21px");
  });

  it("starts first-run notes at full width, but keeps a width already chosen", () => {
    const { unmount } = render(
      <TestProvider initialValues={defaultInitialValues}>
        <WelcomeWizard />
        <FullWidthValue />
      </TestProvider>
    );
    expect(screen.getByTestId("full-width-value")).toHaveTextContent("true");
    expect(window.localStorage.getItem("fullWidth")).toBe("true");
    unmount();

    window.localStorage.setItem("fullWidth", JSON.stringify(false));
    render(
      <TestProvider initialValues={[...defaultInitialValues, [atom_fullWidth, false]]}>
        <WelcomeWizard />
        <FullWidthValue />
      </TestProvider>
    );
    expect(screen.getByTestId("full-width-value")).toHaveTextContent("false");
  });
});

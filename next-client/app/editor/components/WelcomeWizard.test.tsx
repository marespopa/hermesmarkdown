import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Provider } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import WelcomeWizard from "./WelcomeWizard";
import { atom_hasCompletedOnboarding, atom_isWizardOpen } from "@/app/atoms/ui-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_driveVaultId, atom_driveAuthState } from "@/app/atoms/drive-atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";

// Mock hooks
vi.mock("@/app/hooks/use-file-system", () => ({
  useFileSystem: vi.fn(),
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

describe("WelcomeWizard", () => {
  const mockOpenVault = vi.fn();
  const mockOpenDriveVaultPicker = vi.fn();

  const defaultInitialValues: any = [
    [atom_hasCompletedOnboarding, false],
    [atom_isWizardOpen, true],
    [atom_vaultHandle, null],
    [atom_driveVaultId, null],
    [atom_driveAuthState, "unauthenticated"],
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useFileSystem as any).mockReturnValue({
      openVault: mockOpenVault,
      openDriveVaultPicker: mockOpenDriveVaultPicker,
      isVaultSupported: true,
    });
  });

  it("renders the welcome step first", () => {
    render(
      <TestProvider initialValues={defaultInitialValues}>
        <WelcomeWizard />
      </TestProvider>
    );

    expect(screen.getByText("Welcome to HermesMarkdown")).toBeInTheDocument();
  });

  it("advances to connection step when clicking Start Setup", () => {
    render(
      <TestProvider initialValues={defaultInitialValues}>
        <WelcomeWizard />
      </TestProvider>
    );

    fireEvent.click(screen.getByText("Get Started"));
    expect(screen.getByText("Connect Your Vault")).toBeInTheDocument();
  });

  it("advances to preferences automatically if vault is already connected in step 1", async () => {
    const connectedValues = [
      ...defaultInitialValues.filter(([a]: any) => a !== atom_vaultHandle),
      [atom_vaultHandle, { name: "TestVault" }],
    ];

    render(
      <TestProvider initialValues={connectedValues}>
        <WelcomeWizard initialStep={1} />
      </TestProvider>
    );

    // Should now be on Step 2 (Preferences) due to the useEffect
    await waitFor(() => {
      expect(screen.getByText("Quick Preferences")).toBeInTheDocument();
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

    expect(screen.getByText("Quick Preferences")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Continue"));

    await waitFor(() => {
      expect(screen.getByText("You're ready to write.")).toBeInTheDocument();
    });
  });
});

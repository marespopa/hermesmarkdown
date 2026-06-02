import { render, screen } from "@testing-library/react";
import { Provider } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import FloatingSaveIndicator from "./FloatingSaveIndicator";
import { atom_saveStatus, atom_isEditorFocused } from "@/app/atoms/atoms";
import { expect, test, describe } from "vitest";

const HydrateAtoms = ({ initialValues, children }: { initialValues: any, children: React.ReactNode }) => {
  useHydrateAtoms(initialValues);
  return children;
};

const TestProvider = ({ initialValues, children }: { initialValues: any, children: React.ReactNode }) => (
  <Provider>
    <HydrateAtoms initialValues={initialValues}>{children}</HydrateAtoms>
  </Provider>
);

describe("FloatingSaveIndicator", () => {
  test("does not render when editor is not focused", () => {
    render(
      <TestProvider initialValues={[[atom_isEditorFocused, false]]}>
        <FloatingSaveIndicator />
      </TestProvider>
    );
    expect(screen.queryByText(/Saving|Saved|Draft/i)).not.toBeInTheDocument();
  });

  test("renders 'Saving' state when focused", () => {
    render(
      <TestProvider
        initialValues={[
          [atom_isEditorFocused, true],
          [atom_saveStatus, { state: "saving" }],
        ]}
      >
        <FloatingSaveIndicator />
      </TestProvider>
    );
    expect(screen.getByText(/Saving/i)).toBeInTheDocument();
  });

  test("renders 'Saved' state when focused", () => {
    render(
      <TestProvider
        initialValues={[
          [atom_isEditorFocused, true],
          [atom_saveStatus, { state: "saved" }],
        ]}
      >
        <FloatingSaveIndicator />
      </TestProvider>
    );
    expect(screen.getByText(/Saved/i)).toBeInTheDocument();
  });
});

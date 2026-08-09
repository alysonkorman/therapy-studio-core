import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "../ui";
import { EmptyState, Page, Section } from ".";

describe("shared page layout", () => {
  it("renders a semantic page title with optional description and actions", () => {
    render(
      <Page
        actions={<Button>New Resource</Button>}
        description="A focused resource library."
        title="Resources"
      >
        <p>Page content</p>
      </Page>
    );

    expect(screen.getByRole("heading", { level: 1, name: "Resources" })).toBeVisible();
    expect(screen.getByText("A focused resource library.")).toBeVisible();
    expect(screen.getByRole("button", { name: "New Resource" })).toBeVisible();
  });

  it("omits optional page description and actions", () => {
    render(<Page title="Settings">Preferences</Page>);

    expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("labels a section with its heading", () => {
    render(<Section title="Recent Resources">Section content</Section>);

    const section = screen.getByRole("region", { name: "Recent Resources" });
    expect(section).toContainElement(
      screen.getByRole("heading", { level: 2, name: "Recent Resources" })
    );
  });

  it("renders an optional empty-state action", () => {
    render(
      <EmptyState
        action={<Button variant="secondary">Create One</Button>}
        description="Start with a blank resource."
        title="Nothing Here Yet"
      />
    );

    expect(screen.getByRole("heading", { name: "Nothing Here Yet" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Create One" })).toBeVisible();
  });
});

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { ErrorFallback, Loading } from ".";

describe("shared foundation components", () => {
  it("renders an accessible loading status", () => {
    render(<Loading />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading Therapy Studio");
  });

  it("renders an actionable error fallback", () => {
    render(<ErrorFallback />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});

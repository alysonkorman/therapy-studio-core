import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

export function renderWithRouter(ui, { initialEntries = ["/"], ...options } = {}) {
  function RouterWrapper({ children }) {
    return <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>;
  }

  return render(ui, { wrapper: RouterWrapper, ...options });
}

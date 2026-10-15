import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Index } from "@/routes/index";

const savedValue = () =>
  screen
    .getByText("Já guardado")
    .closest("div")!
    .querySelector("strong")!.textContent;

describe("Month progress", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("keeps each month's deposits separate and restores them when you go back", () => {
    const { container } = render(<Index />);

    const chips = () =>
      Array.from(container.querySelectorAll<HTMLButtonElement>("[data-month]"));
    const active = chips().findIndex((c) => c.getAttribute("aria-pressed") === "true");
    const other = active === 0 ? 1 : 0;

    fireEvent.click(screen.getByRole("button", { name: /^Guardar/ }));
    expect(savedValue()).toBe("R$ 20,00");

    fireEvent.click(chips()[other]);
    expect(savedValue()).toBe("R$ 0,00");

    fireEvent.click(chips()[active]);
    expect(savedValue()).toBe("R$ 20,00");

    const stored = Object.keys(localStorage).filter((k) =>
      k.startsWith("monthlyGoalTracker:"),
    );
    expect(stored.length).toBeGreaterThanOrEqual(2);
  });
});

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Index } from "@/routes/index";

// pt-BR currency keeps a non-breaking space after the symbol.
const savedValue = () =>
  screen
    .getByText("Já guardado")
    .closest("div")!
    .querySelector("strong")!
    .textContent!.replace(/\u00a0/g, " ");

describe("Month progress", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("keeps each month's deposits separate and restores them when you go back", () => {
    const { container } = render(<Index />);

    const chip = (i: number) =>
      container.querySelectorAll<HTMLButtonElement>("[data-month]")[i]!;
    const active = Array.from(
      container.querySelectorAll<HTMLButtonElement>("[data-month]"),
    ).findIndex((c) => c.getAttribute("aria-pressed") === "true");
    const other = active === 0 ? 1 : 0;

    fireEvent.click(screen.getByRole("button", { name: /^Guardar/ }));
    expect(savedValue()).toBe("R$ 20,00");

    fireEvent.click(chip(other));
    expect(savedValue()).toBe("R$ 0,00");

    fireEvent.click(chip(active));
    expect(savedValue()).toBe("R$ 20,00");

    const stored = Object.keys(localStorage).filter((k) =>
      k.startsWith("monthlyGoalTracker:"),
    );
    expect(stored.length).toBeGreaterThanOrEqual(2);
  });

  it("places day 1 of the month under its real weekday column", () => {
    const { container } = render(<Index />);

    const grids = container.querySelectorAll("div.grid.grid-cols-7");
    const grid = grids[grids.length - 1]!;
    const now = new Date();
    const firstWeekday = new Date(now.getFullYear(), now.getMonth(), 1).getDay();

    const kids = Array.from(grid.children);
    const firstDay = kids.findIndex((k) => k.tagName === "BUTTON");
    expect(firstDay).toBe(firstWeekday);
    expect(kids[firstDay]!.getAttribute("aria-label")).toMatch(/^1 de /);
    expect(grid.querySelectorAll("button")).toHaveLength(
      new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
    );
  });
});

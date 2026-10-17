import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cloud = vi.hoisted(() => ({
  rows: {} as Record<string, boolean[]>, user: "account-a", failRead: false, failWrite: false,
  upsert: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  useNavigate: () => vi.fn(),
}));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ cancelQueries: vi.fn(), clear: vi.fn() }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { id: cloud.user } } }), signOut: vi.fn() },
  from: (table: string) => ({
    select: () => ({ eq: () => {
      const result = { data: table === "monthly_progress"
        ? Object.entries(cloud.rows).map(([month, completed]) => ({ month, completed })) : null,
        error: cloud.failRead ? new Error("offline") : null };
      return { ...result, maybeSingle: async () => result };
    } }),
    upsert: async (row: { month: string; completed: boolean[] }) => {
      cloud.upsert(table, row);
      if (cloud.failWrite) return { error: new Error("offline") };
      if (table === "monthly_progress") cloud.rows[row.month] = [...row.completed];
      return { error: null };
    },
  }),
} }));
import { App } from "@/routes/_authenticated/app";

const dayOne = () => screen.getByRole("button", { name: /^1 de / });
const ready = () => screen.findByRole("heading", { name: "Calendário de depósitos" });
const saved = () => waitFor(() => expect(screen.getByRole("status").textContent).toContain("Progresso salvo"));

describe("Account month progress", () => {
  beforeEach(() => {
    localStorage.clear(); cloud.rows = {}; cloud.user = "account-a";
    cloud.failRead = false; cloud.failWrite = false; cloud.upsert.mockClear();
  });
  afterEach(cleanup);

  it("restores a selected square from the account after returning to the site", async () => {
    const view = render(<App />); await ready();
    fireEvent.click(dayOne()); await saved();
    expect(cloud.upsert).toHaveBeenCalledWith("monthly_progress", expect.objectContaining({ user_id: "account-a", completed: expect.arrayContaining([true]) }));
    view.unmount(); localStorage.clear();
    render(<App />); await ready();
    expect(dayOne()).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps each month's selected days separate", async () => {
    const { container } = render(<App />); await ready();
    const chips = Array.from(container.querySelectorAll<HTMLButtonElement>("[data-month]"));
    const active = chips.find((c) => c.getAttribute("aria-pressed") === "true");
    const other = chips.find((c) => c.getAttribute("aria-pressed") === "false");
    if (!active || !other) throw new Error("Missing month controls");
    fireEvent.click(dayOne()); await saved();
    fireEvent.click(other); expect(dayOne()).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(active); expect(dayOne()).toHaveAttribute("aria-pressed", "true");
  });

  it("rolls back a square if the account save fails", async () => {
    render(<App />); await ready(); cloud.failWrite = true;
    fireEvent.click(dayOne());
    await screen.findByText(/Não foi possível salvar este dia/);
    expect(dayOne()).toHaveAttribute("aria-pressed", "false");
    expect(cloud.rows).toEqual({});
  });

  it("does not overwrite account data when loading fails", async () => {
    cloud.failRead = true; render(<App />);
    await screen.findByRole("alert");
    expect(cloud.upsert).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "Calendário de depósitos" })).toBeNull();
  });

  it("does not import another account's old browser deposits", async () => {
    localStorage.setItem("monthlyGoalStorageOwner", "account-b");
    localStorage.setItem("monthlyGoalTracker:2026-10", JSON.stringify({ completed: [true] }));
    render(<App />); await ready();
    expect(cloud.upsert).not.toHaveBeenCalled();
    expect(dayOne()).toHaveAttribute("aria-pressed", "false");
  });
});

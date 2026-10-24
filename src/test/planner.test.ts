import { describe, expect, it } from "vitest";
import { buildChallenge, diffDays, parseDateInput, planDeadline } from "@/lib/planner";

const d = (y: number, m: number, day: number) => ({ y, m, d: day });

describe("dates", () => {
  it("parses valid inputs and rejects invalid ones", () => {
    expect(parseDateInput("2026-12-31")).toEqual(d(2026, 12, 31));
    expect(parseDateInput("2026-02-30")).toBe(null);
    expect(parseDateInput("31/12/2026")).toBe(null);
    expect(parseDateInput("")).toBe(null);
  });

  it("counts whole days across month and year boundaries", () => {
    expect(diffDays(d(2026, 10, 24), d(2026, 10, 24))).toBe(0);
    expect(diffDays(d(2026, 10, 24), d(2026, 11, 1))).toBe(8);
    expect(diffDays(d(2026, 12, 25), d(2027, 1, 5))).toBe(11);
    expect(diffDays(d(2026, 10, 24), d(2026, 10, 20))).toBe(-4);
  });
});

describe("planDeadline", () => {
  const today = d(2026, 10, 24);

  it("splits what is missing across the days left (both ends counted)", () => {
    // 24 Oct to 2 Nov = 10 days; R$ 1000 - R$ 0 => R$ 100 per day.
    const plan = planDeadline({ target: 1000, have: 0, today, deadline: d(2026, 11, 2) });
    expect(plan.status).toBe("ok");
    expect(plan.daysLeft).toBe(10);
    expect(plan.perDay).toBe(100);
    expect(plan.perWeek).toBe(700);
    expect(plan.perMonth).toBe(3000);
  });

  it("rounds the daily amount up to the cent so the goal is not missed", () => {
    // 1000 / 3 days = 333.333... => 333.34
    const plan = planDeadline({ target: 1000, have: 0, today, deadline: d(2026, 10, 26) });
    expect(plan.daysLeft).toBe(3);
    expect(plan.perDay).toBe(333.34);
  });

  it("uses what is already saved", () => {
    const plan = planDeadline({ target: 1000, have: 400, today, deadline: d(2026, 11, 2) });
    expect(plan.remaining).toBe(600);
    expect(plan.perDay).toBe(60);
  });

  it("reports done, expired and invalid cases", () => {
    expect(planDeadline({ target: 500, have: 500, today, deadline: d(2026, 11, 2) }).status).toBe("done");
    expect(planDeadline({ target: 500, have: 100, today, deadline: d(2026, 10, 1) }).status).toBe("expired");
    expect(planDeadline({ target: 0, have: 0, today, deadline: d(2026, 11, 2) }).status).toBe("invalid");
    expect(planDeadline({ target: 500, have: 0, today, deadline: null }).status).toBe("invalid");
    expect(planDeadline({ target: 500, have: -5, today, deadline: d(2026, 11, 2) }).status).toBe("invalid");
  });

  it("treats the deadline day itself as one usable day", () => {
    const plan = planDeadline({ target: 80, have: 0, today, deadline: today });
    expect(plan.daysLeft).toBe(1);
    expect(plan.perDay).toBe(80);
  });
});

describe("buildChallenge", () => {
  it("52 weeks: week n saves n times the base, total 1378 x base", () => {
    const c = buildChallenge("semanas52", 5);
    expect(c.steps).toHaveLength(52);
    expect(c.steps[0]).toBe(5);
    expect(c.steps[51]).toBe(260);
    expect(c.total).toBe(5 * 1378);
  });

  it("30-day ladder totals 465 x base", () => {
    const c = buildChallenge("escada30", 2);
    expect(c.steps).toHaveLength(30);
    expect(c.total).toBe(930);
  });

  it("100 envelopes totals 5050 x base", () => {
    const c = buildChallenge("envelopes100", 1);
    expect(c.steps).toHaveLength(100);
    expect(c.total).toBe(5050);
  });

  it("fixed 30 days repeats the base", () => {
    const c = buildChallenge("fixo30", 20);
    expect(c.steps.every((s) => s === 20)).toBe(true);
    expect(c.total).toBe(600);
  });

  it("a non-positive base gives an empty total instead of NaN", () => {
    expect(buildChallenge("escada30", 0).total).toBe(0);
    expect(buildChallenge("escada30", Number.NaN).total).toBe(0);
  });
});

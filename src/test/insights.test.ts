import { describe, expect, it } from "vitest";
import { computeInsights, type InsightInput } from "@/lib/insights";

const money = (v: number) => `R$ ${v}`;
// October 2026 has 31 days.
const base = (marked: number[], today: number, extra: Partial<InsightInput> = {}): InsightInput => ({
  completed: Array.from({ length: 31 }, (_, i) => marked.includes(i + 1)),
  year: 2026,
  month: 9,
  today,
  dailyValue: 20,
  goal: 600,
  money,
  ...extra,
});
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const find = (input: InsightInput, id: string) => computeInsights(input).find((i) => i.id === id);

describe("computeInsights", () => {
  it("returns nothing when goal or daily value are not positive", () => {
    expect(computeInsights(base([], 5, { goal: 0 }))).toEqual([]);
    expect(computeInsights(base([], 5, { dailyValue: 0 }))).toEqual([]);
  });

  it("is on pace when there are more days left than deposits needed", () => {
    // 10 days marked => R$ 200, needs 20 more, 21 days left after day 10.
    const goal = find(base(range(1, 10), 10), "goal")!;
    expect(goal.tone).toBe("good");
    expect(goal.title).toBe("No ritmo da meta");
  });

  it("warns when there is no slack left", () => {
    // 10 days marked => R$ 200, 20 deposits needed; today (12) is open and 19 days remain => 20 available.
    const goal = find(base(range(1, 10), 12), "goal")!;
    expect(goal.tone).toBe("warn");
    expect(goal.title).toBe("Sem folga");
  });

  it("warns and suggests a higher value when the goal is out of reach", () => {
    const goal = find(base(range(1, 5), 25), "goal")!;
    expect(goal.tone).toBe("warn");
    expect(goal.title).toBe("Meta fora de alcance neste valor");
    expect(goal.text).toContain("por dia");
  });

  it("reports the goal as reached when the saved amount covers it", () => {
    const goal = find(base(range(1, 30), 30), "goal")!;
    expect(goal.tone).toBe("good");
    expect(goal.title).toBe("Meta batida");
    expect(find(base(range(1, 30), 30), "milestone")).toBeUndefined();
  });

  it("computes consistency over the days elapsed", () => {
    const c = find(base([1, 2, 3, 4], 8), "consistency")!;
    expect(c.title).toBe("Consistência de 50%");
    expect(c.tone).toBe("info");
  });

  it("counts unmarked days before today", () => {
    const missed = find(base([1, 2, 5], 6), "missed")!;
    expect(missed.text.startsWith("2 dias anteriores")).toBe(true);
    expect(find(base(range(1, 5), 6), "missed")).toBeUndefined();
  });

  it("names the weekday with the most deposits only when there is a clear winner", () => {
    // Oct 2026: day 1 is a Thursday, so 1, 8, 15 are Thursdays.
    const w = find(base([1, 8, 15, 16], 20), "weekday")!;
    expect(w.title).toBe("Você marca mais nas quintas");
    expect(find(base([1, 2, 3, 4], 20), "weekday")).toBeUndefined();
  });

  it("points to the next milestone", () => {
    // 10 days => R$ 200 (33%); the next milestone is 50% = R$ 300 => 5 deposits.
    const m = find(base(range(1, 10), 10), "milestone")!;
    expect(m.title).toBe("Próximo marco: 50%");
    expect(m.text.startsWith("5 depósitos")).toBe(true);
  });
});

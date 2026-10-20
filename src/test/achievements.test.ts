import { describe, expect, it } from "vitest";
import { computeAchievements, parseProgressKey, progressKey } from "@/lib/goals";

const main = { id: "main", name: "Meta principal", goal: 600, dailyValue: 20 };
describe("achievements", () => {
  it("unlocks a 7-day streak only after 7 consecutive days", () => {
    const six = Array.from({ length: 31 }, (_, i) => i < 6);
    const seven = Array.from({ length: 31 }, (_, i) => i < 7);
    const get = (arr: boolean[]) => computeAchievements({ "2026-01": arr }, [main]).find((a) => a.id === "week")!.unlocked;
    expect(get(six)).toBe(false);
    expect(get(seven)).toBe(true);
  });
  it("marks goal reached when saved reaches the monthly goal (30 x 20 = 600)", () => {
    const arr = Array.from({ length: 31 }, (_, i) => i < 30);
    expect(computeAchievements({ "2026-01": arr }, [main]).find((a) => a.id === "goal")!.unlocked).toBe(true);
  });
  it("keeps extra goal keys separate from the main goal", () => {
    expect(progressKey("main", "2026-01")).toBe("2026-01");
    expect(parseProgressKey(progressKey("abc", "2026-01"))?.goalId).toBe("abc");
  });
});

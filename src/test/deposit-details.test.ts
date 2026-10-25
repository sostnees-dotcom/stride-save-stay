import { describe, expect, it } from "vitest";
import { bonusByKey, bonusFor, rowsToMap, savedFor, validateDetail } from "@/lib/deposit-details";

const month = (marked: number[], len = 31) => Array.from({ length: len }, (_, i) => marked.includes(i + 1));

describe("rowsToMap", () => {
  it("groups by progress key and skips unusable rows", () => {
    const map = rowsToMap([
      { goal_id: "main", month: "2026-10", day: 3, amount: "35.50", note: "bônus" },
      { goal_id: "abc", month: "2026-10", day: 4, amount: null, note: "só anotação" },
      { goal_id: "main", month: "2026-10", day: 40, amount: 10, note: "" },
      { goal_id: "main", month: "2026-10", day: 5, amount: null, note: "  " },
      { goal_id: "main", month: "2026-10", day: 6, amount: -3, note: "" },
    ]);
    expect(Object.keys(map).sort()).toEqual(["2026-10", "abc|2026-10"]);
    expect(map["2026-10"]).toEqual({ 3: { amount: 35.5, note: "bônus" } });
    expect(map["abc|2026-10"]![4]).toEqual({ amount: null, note: "só anotação" });
  });
});

describe("bonusFor / savedFor", () => {
  const details = {
    2: { amount: 35, note: "" },
    3: { amount: 0, note: "" },
    9: { amount: 100, note: "" }, // day 9 is not marked: ignored
    4: { amount: null, note: "só nota" },
  };
  const completed = month([1, 2, 3, 4]);

  it("adds the difference only for marked days with a custom amount", () => {
    // day 2: +15, day 3: -20, day 4: no amount => bonus -5
    expect(bonusFor(completed, details, 20)).toBe(-5);
  });

  it("computes the saved total with custom amounts", () => {
    // 4 marked days * 20 = 80, minus 5
    expect(savedFor(completed, details, 20)).toBe(75);
    expect(savedFor(completed, undefined, 20)).toBe(80);
  });

  it("does not leak floating point noise", () => {
    expect(savedFor(month([1, 2, 3]), { 1: { amount: 0.1, note: "" }, 2: { amount: 0.2, note: "" } }, 0)).toBe(0.3);
  });
});

describe("bonusByKey", () => {
  it("returns only keys with a non-zero bonus and uses each goal's daily value", () => {
    const progress = { "2026-10": month([1, 2]), "g1|2026-10": month([1]), "none|2026-10": month([1]) };
    const details = {
      "2026-10": { 1: { amount: 30, note: "" } },
      "g1|2026-10": { 1: { amount: 10, note: "" } },
      "none|2026-10": { 1: { amount: 99, note: "" } },
    };
    const out = bonusByKey(progress, details, (k) => (k === "2026-10" ? 20 : k.startsWith("g1") ? 10 : undefined));
    expect(out).toEqual({ "2026-10": 10 });
  });
});

describe("validateDetail", () => {
  it("accepts an empty amount as 'standard value'", () => {
    expect(validateDetail("", "  oi  ")).toEqual({ ok: true, amount: null, note: "oi" });
  });
  it("accepts a decimal comma and rounds to cents", () => {
    expect(validateDetail("35,555", "")).toEqual({ ok: true, amount: 35.56, note: "" });
  });
  it("rejects negative, non-numeric, huge and over-long input", () => {
    expect(validateDetail("-1", "").ok).toBe(false);
    expect(validateDetail("abc", "").ok).toBe(false);
    expect(validateDetail("99999999999", "").ok).toBe(false);
    expect(validateDetail("", "x".repeat(201)).ok).toBe(false);
  });
});

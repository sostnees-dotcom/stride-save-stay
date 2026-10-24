import { describe, expect, it } from "vitest";
import { buildDepositsCsv, csvCell, yearSummaryText, type ExportData } from "@/lib/export";

const main = { id: "main", name: "Meta principal", goal: 600, dailyValue: 20 };
const trip = { id: "t1", name: "=Viagem", goal: 1000, dailyValue: 12.5 };
const month = (marked: number[], len = 31) => Array.from({ length: len }, (_, i) => marked.includes(i + 1));

const data: ExportData = {
  currency: "BRL",
  goals: [main, trip],
  progress: {
    "2026-10": month([2, 1]),
    "t1|2026-09": month([30], 30),
    "ghost|2026-10": month([5]),
    "bad-key": month([1]),
  },
};

describe("buildDepositsCsv", () => {
  it("starts with a BOM and the header, and ends with a line break", () => {
    const csv = buildDepositsCsv(data);
    expect(csv.startsWith("﻿Meta;Data;Valor;Moeda\r\n")).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("lists one row per marked day, sorted by date, with decimal comma", () => {
    const lines = buildDepositsCsv(data).replace("﻿", "").trim().split("\r\n");
    expect(lines).toEqual([
      "Meta;Data;Valor;Moeda",
      "'=Viagem;2026-09-30;12,50;BRL",
      "Meta principal;2026-10-01;20,00;BRL",
      "Meta principal;2026-10-02;20,00;BRL",
    ]);
  });

  it("ignores unknown goals and malformed keys", () => {
    const csv = buildDepositsCsv(data);
    expect(csv).not.toContain("ghost");
    expect(csv.split("\r\n").filter(Boolean)).toHaveLength(4);
  });

  it("can be limited to a single goal", () => {
    const lines = buildDepositsCsv(data, "main").trim().split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines.slice(1).every((l) => l.startsWith("Meta principal;"))).toBe(true);
  });

  it("does not include days past the end of the month", () => {
    const long = { ...data, progress: { "2026-02": month([28, 29, 30, 31]) } };
    // No trim(): JavaScript treats the BOM as whitespace and would strip it.
    const lines = buildDepositsCsv(long).split("\r\n").filter(Boolean);
    expect(lines).toEqual(["﻿Meta;Data;Valor;Moeda", "Meta principal;2026-02-28;20,00;BRL"]);
  });
});

describe("csvCell", () => {
  it("quotes separators, quotes and line breaks", () => {
    expect(csvCell("a;b")).toBe('"a;b"');
    expect(csvCell('diz "oi"')).toBe('"diz ""oi"""');
    expect(csvCell("plain")).toBe("plain");
  });
  it("neutralises formulas", () => {
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("@cmd")).toBe("'@cmd");
  });
});

describe("yearSummaryText", () => {
  it("builds a short summary and pluralises", () => {
    const money = (v: number) => `R$ ${v}`;
    expect(yearSummaryText({ year: 2026, total: 1200, depositDays: 60, monthsReached: 2, money })).toBe(
      "Em 2026 eu guardei R$ 1200 em 60 dias de depósito, com 2 meses com a meta batida. Acompanhando no Minha Meta Mensal.",
    );
    expect(yearSummaryText({ year: 2026, total: 20, depositDays: 1, monthsReached: 1, money })).toContain(
      "1 dia de depósito, com 1 mês com a meta batida",
    );
  });
});

// Data export and share helpers. Pure functions, no network.
import { daysIn, parseProgressKey, type GoalInfo } from "./goals";

export type ExportData = {
  currency: string;
  goals: GoalInfo[];
  progress: Record<string, boolean[]>;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Quotes a CSV cell and neutralises spreadsheet formulas ("=", "+", "-", "@"). */
export function csvCell(value: string): string {
  let v = value;
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return /[;"\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/**
 * One row per marked day: goal name, ISO date, amount and currency. Uses ";" and a decimal
 * comma (what Excel expects in pt-BR) plus a UTF-8 BOM so accents open correctly.
 */
export function buildDepositsCsv(data: ExportData, goalId?: string): string {
  const byId = new Map(data.goals.map((g) => [g.id, g]));
  const rows: { date: string; goal: string; value: string }[] = [];

  for (const [key, arr] of Object.entries(data.progress)) {
    const parsed = parseProgressKey(key);
    const goal = parsed && byId.get(parsed.goalId);
    if (!parsed || !goal) continue;
    if (goalId && goal.id !== goalId) continue;
    const total = daysIn(parsed.y, parsed.m);
    arr.slice(0, total).forEach((done, i) => {
      if (!done) return;
      rows.push({
        date: `${parsed.y}-${pad(parsed.m + 1)}-${pad(i + 1)}`,
        goal: goal.name,
        value: goal.dailyValue.toFixed(2).replace(".", ","),
      });
    });
  }

  rows.sort((a, b) => a.date.localeCompare(b.date) || a.goal.localeCompare(b.goal));
  const lines = [
    ["Meta", "Data", "Valor", "Moeda"].join(";"),
    ...rows.map((r) => [csvCell(r.goal), r.date, r.value, data.currency].join(";")),
  ];
  return "﻿" + lines.join("\r\n") + "\r\n";
}

export type YearSummary = {
  year: number;
  total: number;
  depositDays: number;
  monthsReached: number;
  money: (value: number) => string;
};

/** Short text for sharing the year. Never includes names or account data. */
export function yearSummaryText(s: YearSummary): string {
  const days = `${s.depositDays} ${s.depositDays === 1 ? "dia" : "dias"} de depósito`;
  const months = `${s.monthsReached} ${s.monthsReached === 1 ? "mês" : "meses"} com a meta batida`;
  return `Em ${s.year} eu guardei ${s.money(s.total)} em ${days}, com ${months}. Acompanhando no Minha Meta Mensal.`;
}

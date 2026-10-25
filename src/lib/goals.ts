// Shared helpers for goals, money formatting, yearly history and achievements.

export const MAIN_GOAL = "main";
export const CURRENCIES = [
  { code: "BRL", label: "Real (R$)", symbol: "R$" },
  { code: "USD", label: "Dólar (US$)", symbol: "US$" },
  { code: "EUR", label: "Euro (€)", symbol: "€" },
] as const;

export function currencySymbol(code: string) {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? "R$";
}

export function formatMoney(v: number, currency = "BRL") {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(v);
  } catch {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  }
}

export const daysIn = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

/** Progress-map key: main goal uses "YYYY-MM", extra goals use "<goalId>|YYYY-MM". */
export const progressKey = (goalId: string, month: string) =>
  goalId === MAIN_GOAL ? month : `${goalId}|${month}`;

export function parseProgressKey(k: string): { goalId: string; month: string; y: number; m: number } | null {
  const [goalId, month] = k.includes("|") ? (k.split("|") as [string, string]) : [MAIN_GOAL, k];
  if (!/^\d{4}-\d{2}$/.test(month ?? "")) return null;
  const [y, m] = month.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return null;
  return { goalId: goalId!, month, y, m: m - 1 };
}

export type GoalInfo = { id: string; name: string; goal: number; dailyValue: number };

export type Achievement = {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
};

function longestRun(arr: boolean[]) {
  let best = 0;
  let cur = 0;
  for (const c of arr) {
    cur = c ? cur + 1 : 0;
    if (cur > best) best = cur;
  }
  return best;
}

export function computeAchievements(
  progress: Record<string, boolean[]>,
  goals: GoalInfo[],
  currency = "BRL",
  /** Extra money per progress key from custom deposit amounts (see deposit-details.ts). */
  bonus: Record<string, number> = {},
): Achievement[] {
  const byId = new Map(goals.map((g) => [g.id, g]));
  let totalDays = 0;
  let totalSaved = 0;
  let bestRun = 0;
  let perfectMonth = false;
  let goalMonths = 0;
  for (const [k, arr] of Object.entries(progress)) {
    const p = parseProgressKey(k);
    const g = p && byId.get(p.goalId);
    if (!p || !g) continue;
    const days = arr.slice(0, daysIn(p.y, p.m));
    const done = days.filter(Boolean).length;
    totalDays += done;
    const monthSaved = done * g.dailyValue + (bonus[k] ?? 0);
    totalSaved += monthSaved;
    bestRun = Math.max(bestRun, longestRun(days));
    if (done > 0 && done === daysIn(p.y, p.m)) perfectMonth = true;
    if (g.goal > 0 && monthSaved >= g.goal) goalMonths++;
  }
  const a = (id: string, title: string, description: string, unlocked: boolean) => ({
    id,
    title,
    description,
    unlocked,
  });
  return [
    a("first", "Primeiro passo", "Marque seu primeiro depósito.", totalDays >= 1),
    a("week", "Semana firme", "Guarde 7 dias seguidos.", bestRun >= 7),
    a("fortnight", "Quinzena de ferro", "Guarde 15 dias seguidos.", bestRun >= 15),
    a("perfect", "Mês perfeito", "Marque todos os dias de um mês.", perfectMonth),
    a("goal", "Meta batida", "Alcance a meta em um mês.", goalMonths >= 1),
    a("quarter", "Trimestre de ouro", "Alcance a meta em 3 meses.", goalMonths >= 3),
    a("thousand", `${formatMoney(1000, currency)} guardados`, "Acumule esse valor somando tudo.", totalSaved >= 1000),
    a("multi", "Planos diversos", "Tenha mais de uma meta ativa.", goals.length >= 2),
  ];
}

/** Amount saved per month of a year for one goal. */
export function yearSeries(
  progress: Record<string, boolean[]>,
  goal: GoalInfo,
  year: number,
  bonus: Record<string, number> = {},
) {
  return Array.from({ length: 12 }, (_, m) => {
    const month = `${year}-${String(m + 1).padStart(2, "0")}`;
    const key = progressKey(goal.id, month);
    const arr = progress[key] ?? [];
    const done = arr.slice(0, daysIn(year, m)).filter(Boolean).length;
    const saved = done * goal.dailyValue + (bonus[key] ?? 0);
    return { m, saved, days: done, reached: goal.goal > 0 && saved >= goal.goal };
  });
}

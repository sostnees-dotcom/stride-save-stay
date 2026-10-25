// Per-day deposit details (custom amount and note). Pure functions, no network.
// Marked days live elsewhere; details only add to them.

export type DayDetail = { amount: number | null; note: string };

/** progress key (see progressKey in goals.ts) -> day of month (1-based) -> detail */
export type DetailsMap = Record<string, Record<number, DayDetail>>;

export const NOTE_MAX = 200;
export const AMOUNT_MAX = 10_000_000;

export type DetailRow = {
  goal_id: string;
  month: string;
  day: number;
  amount: number | string | null;
  note: string | null;
};

const keyFor = (goalId: string, month: string) => (goalId === "main" ? month : `${goalId}|${month}`);

/** Turns database rows into the nested map, skipping rows that cannot be used. */
export function rowsToMap(rows: DetailRow[]): DetailsMap {
  const map: DetailsMap = {};
  for (const r of rows) {
    const day = Number(r.day);
    if (!Number.isInteger(day) || day < 1 || day > 31) continue;
    const amount = r.amount === null || r.amount === undefined ? null : Number(r.amount);
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) continue;
    const note = (r.note ?? "").trim();
    if (amount === null && note === "") continue;
    const k = keyFor(r.goal_id, r.month);
    (map[k] ??= {})[day] = { amount, note };
  }
  return map;
}

/**
 * Extra money (positive or negative) compared with the standard daily value, counting only
 * days that are currently marked. Unmarked days with details are ignored.
 */
export function bonusFor(
  completed: boolean[],
  details: Record<number, DayDetail> | undefined,
  dailyValue: number,
): number {
  if (!details) return 0;
  let bonus = 0;
  completed.forEach((done, i) => {
    const d = done ? details[i + 1] : undefined;
    if (d && d.amount !== null) bonus += d.amount - dailyValue;
  });
  // Avoid 0.30000000000000004-style artifacts in totals.
  return Math.round(bonus * 100) / 100;
}

/** Total saved in a month: marked days at the standard value, plus custom-amount differences. */
export function savedFor(
  completed: boolean[],
  details: Record<number, DayDetail> | undefined,
  dailyValue: number,
): number {
  const done = completed.filter(Boolean).length;
  return Math.round((done * dailyValue + bonusFor(completed, details, dailyValue)) * 100) / 100;
}

/** Bonus per progress key, for the history and achievements (which only know the daily value). */
export function bonusByKey(
  progress: Record<string, boolean[]>,
  details: DetailsMap,
  dailyValueOf: (progressKey: string) => number | undefined,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, arr] of Object.entries(progress)) {
    const daily = dailyValueOf(k);
    if (daily === undefined) continue;
    const b = bonusFor(arr, details[k], daily);
    if (b !== 0) out[k] = b;
  }
  return out;
}

export type ValidDetail = { ok: true; amount: number | null; note: string };
export type InvalidDetail = { ok: false; error: string };

/** Validates what was typed in the form. Empty amount means "use the standard value". */
export function validateDetail(amountText: string, noteText: string): ValidDetail | InvalidDetail {
  const note = noteText.trim();
  if (note.length > NOTE_MAX) {
    return { ok: false, error: `A anotação pode ter até ${NOTE_MAX} caracteres.` };
  }
  const raw = amountText.trim().replace(",", ".");
  if (raw === "") return { ok: true, amount: null, note };
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0) {
    return { ok: false, error: "Informe um valor igual ou maior que zero, ou deixe em branco." };
  }
  if (amount > AMOUNT_MAX) {
    return { ok: false, error: "Esse valor é alto demais para um único dia." };
  }
  return { ok: true, amount: Math.round(amount * 100) / 100, note };
}

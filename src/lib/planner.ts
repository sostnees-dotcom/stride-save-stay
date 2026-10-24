// Savings planner: deadline goals and ready-made challenges. Pure functions, no network.

export type YMD = { y: number; m: number; d: number }; // m is 1-12

/** Parses the value of an <input type="date"> ("YYYY-MM-DD"). Returns null when invalid. */
export function parseDateInput(value: string): YMD | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return null;
  return { y, m, d };
}

/** Whole days from `a` to `b` (negative when `b` is earlier). Immune to daylight-saving shifts. */
export function diffDays(a: YMD, b: YMD): number {
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000);
}

const ceilCents = (v: number) => Math.ceil(v * 100 - 1e-9) / 100;

export type DeadlineStatus = "invalid" | "done" | "expired" | "ok";

export type DeadlinePlan = {
  status: DeadlineStatus;
  /** Days from today to the deadline, counting both ends. */
  daysLeft: number;
  remaining: number;
  perDay: number;
  perWeek: number;
  /** Per 30 days. */
  perMonth: number;
};

const EMPTY: DeadlinePlan = { status: "invalid", daysLeft: 0, remaining: 0, perDay: 0, perWeek: 0, perMonth: 0 };

export function planDeadline(input: {
  target: number;
  have: number;
  today: YMD;
  deadline: YMD | null;
}): DeadlinePlan {
  const { target, have, today, deadline } = input;
  if (!deadline || !Number.isFinite(target) || !Number.isFinite(have) || target <= 0 || have < 0) return EMPTY;

  const remaining = Math.max(target - have, 0);
  const daysLeft = diffDays(today, deadline) + 1;
  if (remaining === 0) return { ...EMPTY, status: "done", daysLeft: Math.max(daysLeft, 0) };
  if (daysLeft <= 0) return { ...EMPTY, status: "expired", remaining };

  const perDay = ceilCents(remaining / daysLeft);
  return {
    status: "ok",
    daysLeft,
    remaining,
    perDay,
    perWeek: ceilCents((remaining / daysLeft) * 7),
    perMonth: ceilCents((remaining / daysLeft) * 30),
  };
}

export type ChallengeId = "semanas52" | "escada30" | "envelopes100" | "fixo30";

export type Challenge = {
  id: ChallengeId;
  name: string;
  description: string;
  /** What each step is called: "semana", "dia" or "envelope". */
  unit: string;
  /** Amount to save on each step, in order. */
  steps: number[];
  total: number;
};

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const ramp = (n: number, base: number) => Array.from({ length: n }, (_, i) => (i + 1) * base);

export const CHALLENGES: { id: ChallengeId; name: string }[] = [
  { id: "semanas52", name: "52 semanas" },
  { id: "escada30", name: "Escada de 30 dias" },
  { id: "envelopes100", name: "100 envelopes" },
  { id: "fixo30", name: "30 dias fixos" },
];

/** Builds a challenge. `base` is the step amount (the first step, and the increment). */
export function buildChallenge(id: ChallengeId, base: number): Challenge {
  const b = Number.isFinite(base) && base > 0 ? base : 0;
  switch (id) {
    case "semanas52": {
      const steps = ramp(52, b);
      return {
        id,
        name: "52 semanas",
        description: "Na semana 1 você guarda o valor base; a cada semana, mais um valor base.",
        unit: "semana",
        steps,
        total: sum(steps),
      };
    }
    case "escada30": {
      const steps = ramp(30, b);
      return {
        id,
        name: "Escada de 30 dias",
        description: "O valor sobe um degrau por dia: no dia 30 você guarda 30 vezes o valor base.",
        unit: "dia",
        steps,
        total: sum(steps),
      };
    }
    case "envelopes100": {
      const steps = ramp(100, b);
      return {
        id,
        name: "100 envelopes",
        description: "Numere 100 envelopes de 1 a 100. Sorteie um por vez e guarde o número vezes o valor base.",
        unit: "envelope",
        steps,
        total: sum(steps),
      };
    }
    case "fixo30": {
      const steps = Array.from({ length: 30 }, () => b);
      return {
        id,
        name: "30 dias fixos",
        description: "O mesmo valor todos os dias, por 30 dias. É o formato que o calendário do app já acompanha.",
        unit: "dia",
        steps,
        total: sum(steps),
      };
    }
  }
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Moon,
  RotateCcw,
  Sun,
  Target,
  Trophy,
  TriangleAlert,
  Wand2,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Minha Meta Mensal — Desafio de 30 dias" },
      {
        name: "description",
        content:
          "Defina sua meta, marque cada depósito e acompanhe seu progresso mês a mês.",
      },
      { property: "og:title", content: "Minha Meta Mensal" },
      {
        property: "og:description",
        content: "Desafio mensal para guardar dinheiro e acompanhar seu progresso.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const SETTINGS_KEY = "monthlyGoalSettings";
const LEGACY_KEY = "monthlyGoalTracker";
const MONTH_PREFIX = "monthlyGoalTracker:";
const THEME_KEY = "monthlyGoalTheme";

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const MONTHS_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const MILESTONES = [25, 50, 75, 100];

type Settings = { goal: number; dailyValue: number };
const initialSettings: Settings = { goal: 600, dailyValue: 20 };
const NOW = new Date();

const money = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const pad = (n: number) => String(n).padStart(2, "0");
const monthKey = (y: number, m: number) => `${y}-${pad(m + 1)}`;
const daysIn = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const emptyDays = (days: number) => new Array<boolean>(days).fill(false);
const normalize = (raw: unknown, days: number) => {
  const arr = Array.isArray(raw) ? raw : [];
  return Array.from({ length: days }, (_, i) => Boolean(arr[i]));
};

function readJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function scanSummaries(settings: Settings): Record<string, number> {
  const out: Record<string, number> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const full = localStorage.key(i);
    if (!full || !full.startsWith(MONTH_PREFIX)) continue;
    const key = full.slice(MONTH_PREFIX.length);
    const [y, m] = key.split("-").map(Number);
    if (!y || !m) continue;
    const data = readJSON<{ completed?: unknown }>(localStorage.getItem(full));
    const done = normalize(data?.completed, daysIn(y, m - 1)).filter(Boolean).length;
    out[key] =
      settings.goal > 0
        ? Math.min(((done * settings.dailyValue) / settings.goal) * 100, 100)
        : 0;
  }
  return out;
}

function motivational(progress: number): string {
  if (progress >= 100) return "Meta alcançada. Excelente disciplina.";
  if (progress >= 75) return "Reta final — falta muito pouco.";
  if (progress >= 50) return "Metade do caminho percorrida.";
  if (progress >= 25) return "Bom ritmo. O hábito está se formando.";
  if (progress > 0) return "O primeiro passo já foi dado.";
  return "Comece hoje: marque o primeiro dia.";
}

export function Index() {
  const [year, setYear] = useState(NOW.getFullYear());
  const [month, setMonth] = useState(NOW.getMonth());
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [completed, setCompleted] = useState<boolean[]>(() =>
    emptyDays(daysIn(NOW.getFullYear(), NOW.getMonth())),
  );
  const [goalIn, setGoalIn] = useState("600");
  const [dailyIn, setDailyIn] = useState("20");
  const [summaries, setSummaries] = useState<Record<string, number>>({});
  const [milestone, setMilestone] = useState<number | null>(null);
  const [dark, setDark] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const prevProgress = useRef(0);
  const lastMonth = useRef(monthKey(NOW.getFullYear(), NOW.getMonth()));

  const days = daysIn(year, month);
  const key = monthKey(year, month);

  // Settings, theme and the current month — once, from this browser's storage.
  useEffect(() => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    try {
      const stored = readJSON<Settings>(localStorage.getItem(SETTINGS_KEY));
      const legacy = readJSON<Settings & { completed?: unknown }>(
        localStorage.getItem(LEGACY_KEY),
      );
      const next =
        stored ?? (legacy ? { goal: legacy.goal, dailyValue: legacy.dailyValue } : null);
      if (next && next.goal > 0 && next.dailyValue > 0) {
        setSettings(next);
        setGoalIn(String(next.goal));
        setDailyIn(String(next.dailyValue));
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      }
      setDark(localStorage.getItem(THEME_KEY) === "dark");
    } catch {}
  }, []);

  // Every month keeps its own deposits.
  useEffect(() => {
    let loaded: boolean[] | null = null;
    try {
      const raw = localStorage.getItem(MONTH_PREFIX + key);
      if (raw) {
        loaded = normalize(readJSON<{ completed?: unknown }>(raw)?.completed, days);
      } else if (key === monthKey(NOW.getFullYear(), NOW.getMonth())) {
        const legacy = readJSON<{ completed?: unknown }>(localStorage.getItem(LEGACY_KEY));
        if (legacy) loaded = normalize(legacy.completed, days);
      }
    } catch {}
    const next = loaded ?? emptyDays(days);
    setCompleted(next);
    setError(null);
    setConfirmReset(false);
    try {
      localStorage.setItem(MONTH_PREFIX + key, JSON.stringify({ completed: next }));
    } catch {}
  }, [key, days]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  }, [dark]);

  const persist = (next: boolean[]) => {
    try {
      localStorage.setItem(MONTH_PREFIX + key, JSON.stringify({ completed: next }));
    } catch {}
    setCompleted(next);
  };

  const done = completed.filter(Boolean).length;
  const saved = done * settings.dailyValue;
  const remaining = Math.max(settings.goal - saved, 0);
  const progress =
    settings.goal > 0 ? Math.min((saved / settings.goal) * 100, 100) : 0;
  const daysLeft = days - done;
  const perDayNeeded = daysLeft > 0 ? remaining / daysLeft : 0;
  const nextDay = completed.findIndex((c) => !c);

  let streak = 0;
  for (let i = days - 1; i >= 0 && completed[i]; i--) streak++;

  useEffect(() => {
    setSummaries(scanSummaries(settings));
  }, [settings, completed]);

  useEffect(() => {
    const changed = lastMonth.current !== key;
    lastMonth.current = key;
    if (changed) {
      prevProgress.current = progress;
      return;
    }
    const hit = MILESTONES.find((m) => progress >= m && prevProgress.current < m);
    let t: ReturnType<typeof setTimeout> | undefined;
    if (hit !== undefined) {
      setMilestone(hit);
      t = setTimeout(() => setMilestone(null), 3500);
    }
    prevProgress.current = progress;
    return () => {
      if (t) clearTimeout(t);
    };
  }, [progress, key]);

  const apply = () => {
    const g = Number(goalIn),
      d = Number(dailyIn);
    if (!goalIn || !dailyIn || g <= 0 || d <= 0) {
      setError("Informe valores maiores que zero para a meta e o valor por dia.");
      return;
    }
    setError(null);
    const next = { goal: g, dailyValue: d };
    setSettings(next);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {}
  };

  const suggestDaily = () => {
    const g = Number(goalIn);
    if (g > 0) setDailyIn((g / days).toFixed(2));
  };

  const reset = () => {
    persist(emptyDays(days));
    setConfirmReset(false);
  };

  const toggle = (i: number) =>
    persist(completed.map((c, j) => (j === i ? !c : c)));

  return (
    <div className="bg-background min-h-screen px-4 py-6 font-sans text-foreground transition-colors duration-300 sm:px-8 sm:py-10">
      <main className="mx-auto w-full max-w-5xl">
        <div className="mb-5 flex items-center justify-between border-b border-border pb-5">
          <div className="flex items-center gap-2 text-primary">
            <Target className="size-5" strokeWidth={2.5} />
            <span className="text-xs font-bold uppercase tracking-normal">
              Desafio de {days} dias
            </span>
          </div>
          <Button
            variant="outline"
            size="icon"
            title={dark ? "Ativar modo claro" : "Ativar modo escuro"}
            onClick={() => setDark((d) => !d)}
            aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"}
            className="grid size-10 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-card transition hover:text-foreground"
          >
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </div>

        <section aria-label="Meses" className="mb-8 border-b border-border pb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-3">
              <span className="text-xs font-bold uppercase tracking-normal text-primary">
                Meses
              </span>
              <span className="text-sm font-semibold text-muted-foreground">
                {MONTHS[month]} de {year}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="mr-1 text-sm font-extrabold tabular-nums">{year}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setYear((y) => y - 1)}
                aria-label={`Ver o ano ${year - 1}`}
                className="grid size-8 place-items-center rounded-md border-border bg-card text-muted-foreground shadow-none transition hover:text-foreground"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setYear((y) => y + 1)}
                aria-label={`Ver o ano ${year + 1}`}
                className="grid size-8 place-items-center rounded-md border-border bg-card text-muted-foreground shadow-none transition hover:text-foreground"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {MONTHS_SHORT.map((label, m) => {
              const mKey = monthKey(year, m);
              const pct = summaries[mKey] ?? 0;
              const active = m === month;
              return (
                <button
                  key={mKey}
                  type="button"
                  data-month={m}
                  onClick={() => setMonth(m)}
                  aria-pressed={active}
                  title={`${MONTHS[m]} de ${year} · ${Math.round(pct)}% da meta`}
                  className={`min-w-[3.25rem] flex-1 shrink-0 rounded-lg border px-2 pb-2 pt-1.5 text-center transition-colors duration-150 ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  <span className="block text-xs font-bold">{label}</span>
                  <span
                    className={`mt-1.5 block h-1 w-full overflow-hidden rounded-full ${
                      active ? "bg-primary-foreground/25" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`block h-full rounded-full transition-all duration-500 ${
                        active ? "bg-primary-foreground" : "bg-progress"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="text-3xl font-extrabold tracking-normal sm:text-4xl">
              Minha Meta Mensal
            </h1>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Um dia de cada vez. Um objetivo cada vez mais perto.
            </p>
          </div>
          <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <CalendarDays className="size-4" />
            {daysLeft} dias restantes
          </span>
        </header>

        <section className="transition-colors duration-300">
          <div className="grid gap-4 border-y border-border bg-card px-4 py-5 sm:grid-cols-[1fr_1fr_auto] sm:items-center sm:px-6">
            <Field id="goal" label="Meta mensal" value={goalIn} onChange={setGoalIn} />
            <div>
              <Field id="daily" label="Valor por dia" value={dailyIn} onChange={setDailyIn} />
              <Button
                variant="link"
                size="sm"
                onClick={suggestDaily}
                className="mt-1 h-auto justify-start gap-1 p-0 text-xs font-semibold"
              >
                <Wand2 className="size-3" />
                Sugerir: meta ÷ {days} dias
              </Button>
            </div>
            <Button
              onClick={apply}
              className="h-11 self-start px-6 font-bold sm:mt-6"
              title="Aplicar os valores da meta"
            >
              Aplicar
            </Button>
          </div>

          {error && (
            <p className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
              <TriangleAlert className="size-4 shrink-0" />
              {error}
            </p>
          )}

          <div className="my-8 grid grid-cols-2 gap-x-5 gap-y-6 lg:grid-cols-4">
            <Stat label="Já guardado" value={money(saved)} highlight />
            <Stat label="Falta guardar" value={money(remaining)} />
            <Stat label="Dias concluídos" value={`${done} de ${days}`} />
            <Stat
              label={daysLeft > 0 ? "Por dia restante" : "Sequência final"}
              value={daysLeft > 0 ? money(perDayNeeded) : `${streak} dias`}
              hint={streak > 1 ? `Sequência: ${streak} dias` : undefined}
            />
          </div>

          <div className="border-y border-border py-6">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-sm font-bold">Progresso da meta</span>
              <span className="text-2xl font-extrabold text-primary">
                {Math.round(progress)}%
              </span>
            </div>
            <div
              className="relative h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Progresso da meta"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="bg-progress h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
              {MILESTONES.slice(0, 3).map((m) => (
                <span
                  key={m}
                  className="absolute top-0 h-full w-px bg-foreground/15"
                  style={{ left: `${m}%` }}
                />
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-[0.65rem] font-bold text-muted-foreground">
              {MILESTONES.map((m) => (
                <span key={m} className={progress >= m ? "text-primary" : ""}>
                  {m}%
                </span>
              ))}
            </div>
            <p className="mt-4 text-sm font-semibold text-muted-foreground">
              {motivational(progress)}
            </p>
          </div>

          <div className="mb-5 mt-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Calendário de depósitos</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {money(settings.dailyValue)} por depósito · {done} de {days} concluídos
              </p>
            </div>
            {confirmReset ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  onClick={reset}
                  className="rounded-lg bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground transition hover:opacity-90"
                >
                  Confirmar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setConfirmReset(false)}
                  className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:text-destructive"
              >
                <RotateCcw className="size-4" />
                Reiniciar
              </Button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
            {completed.map((c, i) => (
              <Button
                key={i}
                variant="outline"
                type="button"
                onClick={() => toggle(i)}
                aria-label={`Dia ${i + 1}, ${money(settings.dailyValue)}`}
                aria-pressed={c}
                className={`relative flex h-24 flex-col items-center justify-center gap-1 rounded-lg border p-2 shadow-none transition-all duration-150 active:scale-95 ${
                  c
                    ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                    : i === nextDay
                      ? "border-primary bg-background text-foreground ring-2 ring-ring/30"
                      : "border-border bg-background text-foreground hover:border-primary/50 hover:bg-secondary"
                }`}
              >
                <span className="text-[0.65rem] font-bold uppercase tracking-normal opacity-70">
                  Dia {i + 1}
                </span>
                <Check
                  className={`absolute right-2 top-2 size-3 transition-all duration-200 ${
                    c ? "scale-100 opacity-100" : "scale-50 opacity-0"
                  }`}
                  strokeWidth={3}
                />
                <span className="text-sm font-bold">{money(settings.dailyValue)}</span>
              </Button>
            ))}
          </div>

          {nextDay >= 0 && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-6">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet className="size-4" />
                Próximo depósito: dia {nextDay + 1} de {MONTHS[month]}
              </span>
              <Button
                onClick={() => toggle(nextDay)}
                className="h-10 font-semibold"
              >
                Guardar {money(settings.dailyValue)}
                <ArrowUpRight />
              </Button>
            </div>
          )}

          {saved >= settings.goal && (
            <div className="mt-8 flex items-center justify-center gap-3 rounded-lg border border-accent bg-accent/15 p-4 font-bold text-foreground">
              <Trophy className="size-5 text-accent" />
              Meta alcançada! Continue construindo esse hábito.
            </div>
          )}

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Progresso salvo neste navegador
          </p>
        </section>
      </main>

      {milestone !== null && (
        <div className="pointer-events-none fixed inset-x-0 top-6 z-50 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-bold text-primary shadow-card">
            <Trophy className="size-4" />
            {milestone === 100 ? "100% — Meta alcançada!" : `${milestone}% da meta alcançados`}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-xs font-bold uppercase tracking-normal text-muted-foreground"
      >
        {label}
      </label>
      <div className="flex overflow-hidden rounded-lg border border-input bg-background transition focus-within:ring-2 focus-within:ring-ring">
        <span className="grid place-items-center border-r border-input bg-muted px-3 text-sm font-bold text-muted-foreground">
          R$
        </span>
        <input
          id={id}
          type="number"
          min="0.01"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 bg-transparent px-3 py-2.5 font-bold outline-none"
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  highlight = false,
}: {
  label: string;
  value: string;
  hint?: string | undefined;
  highlight?: boolean;
}) {
  return (
    <div className="min-w-0 border-l-2 border-border pl-4">
      <small className="block text-xs font-bold uppercase tracking-normal text-muted-foreground">
        {label}
      </small>
      <strong
        className={`mt-2 block text-xl font-extrabold sm:text-2xl ${
          highlight ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </strong>
      {hint && <small className="mt-0.5 block text-xs font-semibold text-primary">{hint}</small>}
    </div>
  );
}

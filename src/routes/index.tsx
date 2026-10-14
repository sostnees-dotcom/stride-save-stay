import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, Moon, RotateCcw, Sun, Target, Trophy, TriangleAlert, Wand2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Minha Meta Mensal — Desafio de 30 dias" },
      { name: "description", content: "Defina sua meta, marque cada depósito e acompanhe seu progresso em 30 dias." },
      { property: "og:title", content: "Minha Meta Mensal" },
      { property: "og:description", content: "Desafio de 30 dias para guardar dinheiro e acompanhar seu progresso." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const TOTAL = 30;
const KEY = "monthlyGoalTracker";
const THEME_KEY = "monthlyGoalTheme";
type State = { goal: number; dailyValue: number; completed: boolean[] };
const initial: State = { goal: 600, dailyValue: 20, completed: Array(TOTAL).fill(false) };
const money = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const MILESTONES = [25, 50, 75, 100];

function motivational(progress: number): string {
  if (progress >= 100) return "Meta alcançada. Excelente disciplina.";
  if (progress >= 75) return "Reta final — falta muito pouco.";
  if (progress >= 50) return "Metade do caminho percorrida.";
  if (progress >= 25) return "Bom ritmo. O hábito está se formando.";
  if (progress > 0) return "O primeiro passo já foi dado.";
  return "Comece hoje: marque o primeiro dia.";
}

function Index() {
  const [state, setState] = useState<State>(initial);
  const [goalIn, setGoalIn] = useState("600");
  const [dailyIn, setDailyIn] = useState("20");
  const [milestone, setMilestone] = useState<number | null>(null);
  const [dark, setDark] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const prevProgress = useRef(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw) as State;
        setState(s);
        setGoalIn(String(s.goal));
        setDailyIn(String(s.dailyValue));
      }
      setDark(localStorage.getItem(THEME_KEY) === "dark");
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  }, [dark]);

  const update = (s: State) => {
    setState(s);
    localStorage.setItem(KEY, JSON.stringify(s));
  };

  const done = state.completed.filter(Boolean).length;
  const saved = done * state.dailyValue;
  const remaining = Math.max(state.goal - saved, 0);
  const progress = state.goal > 0 ? Math.min((saved / state.goal) * 100, 100) : 0;
  const daysLeft = TOTAL - done;
  const perDayNeeded = daysLeft > 0 ? remaining / daysLeft : 0;
  const nextDay = state.completed.findIndex((c) => !c);

  let streak = 0;
  for (let i = TOTAL - 1; i >= 0 && state.completed[i]; i--) streak++;

  useEffect(() => {
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
  }, [progress]);

  const apply = () => {
    const g = Number(goalIn), d = Number(dailyIn);
    if (!goalIn || !dailyIn || g <= 0 || d <= 0) {
      setError("Informe valores maiores que zero para a meta e o valor por dia.");
      return;
    }
    setError(null);
    update({ ...state, goal: g, dailyValue: d });
  };

  const suggestDaily = () => {
    const g = Number(goalIn);
    if (g > 0) setDailyIn((g / TOTAL).toFixed(2));
  };

  const reset = () => {
    update({ ...state, completed: Array(TOTAL).fill(false) });
    setConfirmReset(false);
  };

  const toggle = (i: number) =>
    update({ ...state, completed: state.completed.map((c, j) => (j === i ? !c : c)) });

  return (
    <div className="bg-page min-h-screen px-4 py-10 font-sans text-foreground transition-colors duration-300 sm:py-14">
      <main className="mx-auto w-full max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <Target className="size-5" strokeWidth={2.5} />
            <span className="text-sm font-extrabold uppercase tracking-widest">Desafio de 30 dias</span>
          </div>
          <button
            onClick={() => setDark((d) => !d)}
            aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"}
            className="grid size-10 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-card transition hover:text-foreground"
          >
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </div>

        <header className="mb-10">
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Minha Meta Mensal
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Defina sua meta, marque cada depósito e acompanhe seu progresso dia a dia.
          </p>
        </header>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-card transition-colors duration-300 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field id="goal" label="Meta mensal" value={goalIn} onChange={setGoalIn} />
            <div>
              <Field id="daily" label="Valor por dia" value={dailyIn} onChange={setDailyIn} />
              <button
                onClick={suggestDaily}
                className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-primary transition hover:opacity-80"
              >
                <Wand2 className="size-3" />
                Sugerir: meta ÷ 30 dias
              </button>
            </div>
            <button
              onClick={apply}
              className="rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 active:scale-[0.98]"
            >
              Aplicar
            </button>
          </div>

          {error && (
            <p className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
              <TriangleAlert className="size-4 shrink-0" />
              {error}
            </p>
          )}

          <div className="my-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Já guardado" value={money(saved)} />
            <Stat label="Falta guardar" value={money(remaining)} />
            <Stat label="Dias concluídos" value={`${done} de ${TOTAL}`} />
            <Stat
              label={daysLeft > 0 ? "Por dia restante" : "Sequência final"}
              value={daysLeft > 0 ? money(perDayNeeded) : `${streak} dias`}
              hint={streak > 1 ? `Sequência: ${streak} dias` : undefined}
            />
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-sm font-bold">Progresso da meta</span>
              <span className="font-display text-xl font-bold text-primary">{Math.round(progress)}%</span>
            </div>
            <div className="relative h-3 overflow-hidden rounded-full bg-muted">
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
            <p className="mt-4 border-l-2 border-primary pl-3 text-sm font-semibold text-muted-foreground">
              {motivational(progress)}
            </p>
          </div>

          <div className="mb-4 mt-10 flex items-end justify-between gap-4 border-t border-border pt-8">
            <div>
              <h2 className="font-display text-xl font-bold">Calendário de depósitos</h2>
              <p className="mt-1 text-sm text-muted-foreground">Clique em um dia sempre que guardar o valor.</p>
            </div>
            {confirmReset ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={reset}
                  className="rounded-lg bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground transition hover:opacity-90"
                >
                  Confirmar
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:text-destructive"
              >
                <RotateCcw className="size-4" />
                Reiniciar
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 md:grid-cols-6">
            {state.completed.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggle(i)}
                aria-label={`Dia ${i + 1}, ${money(state.dailyValue)}`}
                aria-pressed={c}
                className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl border p-2 transition-all duration-150 active:scale-95 ${
                  c
                    ? "border-primary bg-primary text-primary-foreground"
                    : i === nextDay
                      ? "border-primary bg-background text-foreground ring-2 ring-ring/30"
                      : "border-border bg-background text-foreground hover:border-primary/50 hover:bg-secondary"
                }`}
              >
                <span className="text-[0.65rem] font-bold uppercase tracking-wider opacity-60">Dia {i + 1}</span>
                <Check
                  className={`size-5 transition-all duration-200 ${c ? "scale-100 opacity-100" : "scale-50 opacity-10"}`}
                  strokeWidth={3}
                />
                <span className="text-xs font-bold">{money(state.dailyValue)}</span>
              </button>
            ))}
          </div>

          {saved >= state.goal && (
            <div className="mt-8 flex items-center justify-center gap-3 rounded-xl border border-accent bg-accent/15 p-4 font-bold text-foreground">
              <Trophy className="size-5 text-accent" />
              Meta alcançada! Continue construindo esse hábito.
            </div>
          )}

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Seu progresso fica salvo neste navegador — volte quando quiser.
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

function Field({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="flex overflow-hidden rounded-lg border border-input bg-background transition focus-within:ring-2 focus-within:ring-ring">
        <span className="grid place-items-center border-r border-input bg-muted px-3 text-sm font-bold text-muted-foreground">R$</span>
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

function Stat({ label, value, hint }: { label: string; value: string; hint?: string | undefined }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/60 px-4 py-3.5">
      <small className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</small>
      <strong className="mt-1 block font-display text-2xl">{value}</strong>
      {hint && <small className="mt-0.5 block text-xs font-semibold text-primary">{hint}</small>}
    </div>
  );
}

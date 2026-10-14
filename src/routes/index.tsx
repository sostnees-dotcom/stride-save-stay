import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

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
  if (progress >= 100) return "Meta alcançada! Você é incrível.";
  if (progress >= 75) return "Reta final! Falta pouquíssimo.";
  if (progress >= 50) return "Metade do caminho! Continue firme.";
  if (progress >= 25) return "Ótimo começo! O hábito está se formando.";
  if (progress > 0) return "O primeiro passo já foi dado. Bora!";
  return "Comece hoje: marque o primeiro dia.";
}

function Index() {
  const [state, setState] = useState<State>(initial);
  const [goalIn, setGoalIn] = useState("600");
  const [dailyIn, setDailyIn] = useState("20");
  const [burst, setBurst] = useState<number | null>(null);
  const [milestone, setMilestone] = useState<number | null>(null);
  const [dark, setDark] = useState(false);
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
    if (g <= 0 || d <= 0) return alert("Informe valores maiores que zero.");
    update({ ...state, goal: g, dailyValue: d });
  };
  const reset = () => {
    if (confirm("Deseja desmarcar todos os dias?"))
      update({ ...state, completed: Array(TOTAL).fill(false) });
  };
  const toggle = (i: number) => {
    if (!state.completed[i]) {
      setBurst(i);
      setTimeout(() => setBurst(null), 600);
    }
    update({ ...state, completed: state.completed.map((c, j) => (j === i ? !c : c)) });
  };

  return (
    <div className="bg-page min-h-screen px-4 py-10 font-sans text-foreground transition-colors duration-300">
      <main className="mx-auto w-full max-w-4xl">
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setDark((d) => !d)}
            aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"}
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-bold shadow-card transition hover:-translate-y-0.5"
          >
            {dark ? "☀️ Claro" : "🌙 Escuro"}
          </button>
        </div>

        <header className="mb-8 text-center">
          <span className="mb-3 inline-block rounded-full border border-border bg-card px-4 py-1 text-xs font-extrabold uppercase tracking-widest text-primary shadow-card">
            Desafio de 30 dias
          </span>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-primary sm:text-6xl">
            Minha Meta Mensal
          </h1>
          <p className="mt-3 text-muted-foreground">
            Defina sua meta, marque cada depósito e acompanhe seu progresso.
          </p>
        </header>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-card transition-colors duration-300 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field id="goal" label="Meta mensal" value={goalIn} onChange={setGoalIn} />
            <Field id="daily" label="Valor por dia" value={dailyIn} onChange={setDailyIn} />
            <button
              onClick={apply}
              className="rounded-xl bg-primary px-6 py-3 font-extrabold text-primary-foreground transition hover:-translate-y-0.5 hover:opacity-90 active:translate-y-0"
            >
              Aplicar
            </button>
          </div>

          <div className="my-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <div className="mb-2 flex justify-between text-sm font-bold">
              <span>Progresso da meta</span>
              <span className="text-primary">{Math.round(progress)}%</span>
            </div>
            <div className="relative h-4 overflow-hidden rounded-full bg-muted">
              <div
                className="bg-progress relative h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              >
                <span className="absolute inset-0 animate-pulse rounded-full bg-white/20" />
              </div>
              {MILESTONES.slice(0, 3).map((m) => (
                <span
                  key={m}
                  className="absolute top-0 h-full w-0.5 bg-foreground/20"
                  style={{ left: `${m}%` }}
                />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[0.65rem] font-bold text-muted-foreground">
              {MILESTONES.map((m) => (
                <span key={m} className={progress >= m ? "text-primary" : ""}>
                  {m}%
                </span>
              ))}
            </div>
            <p className="mt-3 text-center text-sm font-bold text-primary">{motivational(progress)}</p>
          </div>

          <div className="mb-4 mt-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold">Desafio de 30 dias</h2>
              <p className="text-sm text-muted-foreground">Clique em um quadrado sempre que guardar o valor.</p>
            </div>
            <button
              onClick={reset}
              className="rounded-xl border border-border bg-muted px-4 py-2 text-sm font-bold text-muted-foreground transition hover:text-destructive"
            >
              Reiniciar
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-6">
            {state.completed.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggle(i)}
                aria-label={`Dia ${i + 1}, ${money(state.dailyValue)}`}
                aria-pressed={c}
                className={`relative flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 p-2 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 ${
                  c
                    ? "border-primary bg-primary text-primary-foreground shadow-card"
                    : "border-border bg-background text-foreground hover:border-primary"
                }`}
              >
                {burst === i && (
                  <span className="pointer-events-none absolute -top-3 animate-bounce text-lg">🎉</span>
                )}
                <span className="text-[0.7rem] font-extrabold tracking-wider opacity-70">DIA {i + 1}</span>
                <span
                  className={`text-2xl font-extrabold transition-transform duration-300 ${
                    c ? "scale-110 text-accent" : "opacity-15"
                  }`}
                >
                  ✓
                </span>
                <span className="text-xs font-bold">{money(state.dailyValue)}</span>
              </button>
            ))}
          </div>

          {saved >= state.goal && (
            <div className="mt-6 rounded-2xl bg-accent p-4 text-center font-extrabold text-accent-foreground">
              🎊 Meta alcançada! Continue construindo esse hábito. 🎊
            </div>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Seu progresso fica salvo neste navegador — volte quando quiser.
          </p>
        </section>
      </main>

      {milestone !== null && (
        <div className="pointer-events-none fixed inset-x-0 top-6 z-50 flex justify-center px-4">
          <div className="animate-bounce rounded-2xl border border-border bg-card px-6 py-3 text-center font-extrabold text-primary shadow-card">
            {milestone === 100 ? "🏆 100% — Meta alcançada!" : `🎯 ${milestone}% da meta! Continue assim!`}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-bold text-muted-foreground">{label}</label>
      <div className="flex overflow-hidden rounded-xl border border-input bg-background transition focus-within:ring-2 focus-within:ring-ring">
        <span className="grid place-items-center bg-muted px-3 font-bold text-muted-foreground">R$</span>
        <input
          id={id}
          type="number"
          min="0.01"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 bg-transparent px-3 py-3 font-bold outline-none"
        />
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string | undefined }) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/50 p-4">
      <small className="block text-sm font-semibold text-muted-foreground">{label}</small>
      <strong className="font-display text-2xl">{value}</strong>
      {hint && <small className="mt-1 block text-xs font-semibold text-primary">{hint}</small>}
    </div>
  );
}

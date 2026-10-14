import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

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
type State = { goal: number; dailyValue: number; completed: boolean[] };
const initial: State = { goal: 600, dailyValue: 20, completed: Array(TOTAL).fill(false) };
const money = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function Index() {
  const [state, setState] = useState<State>(initial);
  const [goalIn, setGoalIn] = useState("600");
  const [dailyIn, setDailyIn] = useState("20");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw) as State;
        setState(s);
        setGoalIn(String(s.goal));
        setDailyIn(String(s.dailyValue));
      }
    } catch {}
  }, []);

  const update = (s: State) => {
    setState(s);
    localStorage.setItem(KEY, JSON.stringify(s));
  };

  const done = state.completed.filter(Boolean).length;
  const saved = done * state.dailyValue;
  const remaining = Math.max(state.goal - saved, 0);
  const progress = state.goal > 0 ? Math.min((saved / state.goal) * 100, 100) : 0;

  const apply = () => {
    const g = Number(goalIn), d = Number(dailyIn);
    if (g <= 0 || d <= 0) return alert("Informe valores maiores que zero.");
    update({ ...state, goal: g, dailyValue: d });
  };
  const reset = () => {
    if (confirm("Deseja desmarcar todos os dias?"))
      update({ ...state, completed: Array(TOTAL).fill(false) });
  };
  const toggle = (i: number) =>
    update({ ...state, completed: state.completed.map((c, j) => (j === i ? !c : c)) });

  return (
    <div className="bg-page min-h-screen px-4 py-10 font-sans text-foreground">
      <main className="mx-auto w-full max-w-4xl">
        <header className="mb-8 text-center">
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-primary sm:text-6xl">
            Minha Meta Mensal
          </h1>
          <p className="mt-3 text-muted-foreground">
            Defina sua meta, marque cada depósito e acompanhe seu progresso.
          </p>
        </header>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field id="goal" label="Meta mensal" value={goalIn} onChange={setGoalIn} />
            <Field id="daily" label="Valor por dia" value={dailyIn} onChange={setDailyIn} />
            <button
              onClick={apply}
              className="rounded-xl bg-primary px-6 py-3 font-extrabold text-primary-foreground transition hover:-translate-y-0.5 hover:opacity-90"
            >
              Aplicar
            </button>
          </div>

          <div className="my-6 grid gap-3 sm:grid-cols-3">
            <Stat label="Já guardado" value={money(saved)} />
            <Stat label="Falta guardar" value={money(remaining)} />
            <Stat label="Dias concluídos" value={`${done} de ${TOTAL}`} />
          </div>

          <div>
            <div className="mb-2 flex justify-between text-sm font-bold">
              <span>Progresso da meta</span>
              <span className="text-primary">{Math.round(progress)}%</span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-muted">
              <div className="bg-progress h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
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
                className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 p-2 transition hover:-translate-y-0.5 ${
                  c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:border-primary"
                }`}
              >
                <span className="text-[0.7rem] font-extrabold tracking-wider opacity-70">DIA {i + 1}</span>
                <span className={`text-2xl font-extrabold ${c ? "text-accent" : "opacity-15"}`}>✓</span>
                <span className="text-xs font-bold">{money(state.dailyValue)}</span>
              </button>
            ))}
          </div>

          {saved >= state.goal && (
            <div className="mt-6 rounded-2xl bg-accent p-4 text-center font-extrabold text-accent-foreground">
              Meta alcançada! Continue construindo esse hábito.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Field({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-bold text-muted-foreground">{label}</label>
      <div className="flex overflow-hidden rounded-xl border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/50 p-4">
      <small className="block text-sm font-semibold text-muted-foreground">{label}</small>
      <strong className="font-display text-2xl">{value}</strong>
    </div>
  );
}

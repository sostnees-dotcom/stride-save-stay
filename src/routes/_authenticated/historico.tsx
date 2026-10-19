import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Lock, Trophy } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { loadAccountData, type AccountData } from "@/lib/goal-data";
import { computeAchievements, formatMoney, yearSeries } from "@/lib/goals";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({
    meta: [
      { title: "Histórico e conquistas — Minha Meta Mensal" },
      { name: "description", content: "Veja quanto você guardou mês a mês e as conquistas desbloqueadas." },
      { property: "og:title", content: "Histórico e conquistas — Minha Meta Mensal" },
      { property: "og:description", content: "Gráficos do seu progresso e medalhas por disciplina." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
});

const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function HistoryPage() {
  const [data, setData] = useState<AccountData | null>(null);
  const [failed, setFailed] = useState(false);
  const [goalId, setGoalId] = useState("main");
  const [year, setYear] = useState(() => new Date().getFullYear());

  useEffect(() => {
    loadAccountData().then(setData).catch(() => setFailed(true));
  }, []);

  const goal = data?.goals.find((g) => g.id === goalId) ?? data?.goals[0];
  const series = useMemo(
    () => (data && goal ? yearSeries(data.progress, goal, year) : []),
    [data, goal, year],
  );
  const achievements = useMemo(
    () => (data ? computeAchievements(data.progress, data.goals, data.currency) : []),
    [data],
  );

  if (failed) {
    return (
      <main className="bg-page flex min-h-screen flex-col items-center justify-center gap-4 text-foreground">
        <p role="alert">Não foi possível carregar seu histórico.</p>
        <Button onClick={() => location.reload()}>Tentar novamente</Button>
      </main>
    );
  }
  if (!data || !goal) {
    return (
      <div className="bg-page flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" /> Carregando histórico…
      </div>
    );
  }

  const cur = data.currency;
  const total = series.reduce((s, x) => s + x.saved, 0);
  const totalDays = series.reduce((s, x) => s + x.days, 0);
  const reached = series.filter((x) => x.reached).length;
  const best = series.reduce((b, x) => (x.saved > b.saved ? x : b), series[0]!);
  const unlocked = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="bg-page min-h-screen px-4 py-6 font-sans text-foreground sm:px-8 sm:py-10">
      <main className="mx-auto w-full max-w-5xl">
        <div className="mb-8 flex items-center justify-between border-b border-border pb-5">
          <Button asChild variant="ghost" className="gap-2 px-2">
            <Link to="/app"><ArrowLeft className="size-4" /> Voltar ao calendário</Link>
          </Button>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="icon" className="size-8" aria-label="Ano anterior" onClick={() => setYear((y) => y - 1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="w-12 text-center text-sm font-extrabold tabular-nums">{year}</span>
            <Button variant="outline" size="icon" className="size-8" aria-label="Próximo ano" onClick={() => setYear((y) => y + 1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Histórico</h1>
        <p className="mt-3 text-muted-foreground">Sua evolução ao longo de {year}.</p>

        {data.goals.length > 1 && (
          <nav aria-label="Metas" className="mt-6 flex flex-wrap gap-2">
            {data.goals.map((g) => (
              <button
                key={g.id}
                type="button"
                aria-pressed={g.id === goal.id}
                onClick={() => setGoalId(g.id)}
                className={`rounded-full border px-4 py-1.5 text-sm font-bold transition-colors ${
                  g.id === goal.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {g.name}
              </button>
            ))}
          </nav>
        )}

        <div className="my-8 grid grid-cols-2 gap-x-5 gap-y-6 lg:grid-cols-4">
          <Stat label="Guardado no ano" value={formatMoney(total, cur)} highlight />
          <Stat label="Dias de depósito" value={String(totalDays)} />
          <Stat label="Meses com meta batida" value={`${reached} de 12`} />
          <Stat label="Melhor mês" value={best.saved > 0 ? MONTHS_SHORT[best.m]! : "—"} />
        </div>

        <section className="shadow-panel rounded-xl border border-border bg-card p-4 sm:p-6">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="label-caps text-muted-foreground">Guardado por mês</h2>
            <span className="text-xs text-muted-foreground">Meta: {formatMoney(goal.goal, cur)}/mês</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series.map((x) => ({ ...x, name: MONTHS_SHORT[x.m] }))}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} width={70} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickFormatter={(v: number) => formatMoney(v, cur).replace(/,00$/, "")} />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)" }}
                  formatter={(v: number) => [formatMoney(v, cur), "Guardado"]}
                />
                <Bar dataKey="saved" radius={[6, 6, 0, 0]}>
                  {series.map((x) => (
                    <Cell key={x.m} fill={x.reached ? "var(--accent)" : "var(--primary)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Barras douradas: meses em que a meta foi alcançada.</p>
        </section>

        <section className="mt-12" aria-labelledby="conquistas">
          <div className="mb-5 flex items-baseline justify-between border-b border-border pb-3">
            <h2 id="conquistas" className="font-display text-3xl font-semibold">Conquistas</h2>
            <span className="text-sm font-semibold text-muted-foreground">{unlocked} de {achievements.length}</span>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {achievements.map((a) => (
              <li
                key={a.id}
                className={`rounded-xl border p-4 transition-colors ${
                  a.unlocked ? "border-accent bg-accent/10" : "border-border bg-card opacity-70"
                }`}
              >
                <span className={`grid size-9 place-items-center rounded-full ${a.unlocked ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
                  {a.unlocked ? <Trophy className="size-4" /> : <Lock className="size-4" />}
                </span>
                <strong className="mt-3 block text-sm">{a.title}</strong>
                <small className="mt-1 block text-xs text-muted-foreground">{a.description}</small>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="min-w-0 border-l border-border pl-4">
      <small className="label-caps block text-muted-foreground">{label}</small>
      <strong className={`font-display mt-1.5 block text-2xl font-semibold tabular-nums sm:text-3xl ${highlight ? "text-primary" : ""}`}>
        {value}
      </strong>
    </div>
  );
}

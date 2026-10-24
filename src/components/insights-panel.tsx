import { useMemo } from "react";
import { Activity, Check, Cpu, Gauge } from "lucide-react";

import { computeInsights, type Insight, type InsightInput, type InsightTone } from "@/lib/insights";

const TONE: Record<InsightTone, { bar: string; icon: React.ReactNode }> = {
  good: { bar: "bg-primary", icon: <Check className="size-4 text-primary" strokeWidth={3} /> },
  warn: { bar: "bg-accent", icon: <Gauge className="size-4 text-accent" /> },
  info: { bar: "bg-border", icon: <Activity className="size-4 text-muted-foreground" /> },
};

/** Lists the automatic analysis for the running month. Renders nothing when there is nothing to say. */
export function InsightsPanel({ input }: { input: InsightInput }) {
  const { completed, year, month, today, dailyValue, goal, money } = input;
  // `money` is usually a stable module-level function; the data fields drive recalculation.
  const insights = useMemo(
    () => computeInsights({ completed, year, month, today, dailyValue, goal, money }),
    [completed, year, month, today, dailyValue, goal, money],
  );
  if (insights.length === 0) return null;

  return (
    <section
      aria-labelledby="analise-titulo"
      className="scan relative mt-8 overflow-hidden rounded-3xl border border-primary/30 bg-card p-5 shadow-card sm:p-6"
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Cpu className="size-5" />
          </span>
          <h2 id="analise-titulo" className="text-lg font-bold">
            Análise automática
          </h2>
        </div>
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <span aria-hidden="true" className="pulse-ring size-2 rounded-full bg-primary" />
          Atualiza ao marcar
        </span>
      </header>

      <ul className="mt-5 grid gap-3 md:grid-cols-2">
        {insights.map((item, i) => (
          <InsightRow key={item.id} item={item} delay={i * 90} />
        ))}
      </ul>

      <p className="mt-5 text-xs text-muted-foreground">
        Calculado aqui no app, a partir dos dias que você marcou.
      </p>
    </section>
  );
}

export function InsightRow({ item, delay = 0 }: { item: Insight; delay?: number }) {
  const tone = TONE[item.tone];
  return (
    <li
      className="cell-in relative flex gap-3 overflow-hidden rounded-2xl border border-border bg-background/60 py-3 pl-5 pr-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1.5 ${tone.bar}`} />
      <span className="mt-0.5 shrink-0">{tone.icon}</span>
      <div>
        <p className="text-sm font-bold leading-snug">{item.title}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
      </div>
    </li>
  );
}

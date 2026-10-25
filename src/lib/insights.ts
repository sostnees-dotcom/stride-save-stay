// Automatic month analysis. Pure functions: everything is computed on the device
// from the days the person marked, with no network calls and no external service.

export type InsightTone = "good" | "warn" | "info";

export type Insight = {
  id: string;
  tone: InsightTone;
  title: string;
  text: string;
};

export type InsightInput = {
  /** One flag per day of the month (true = deposit marked). */
  completed: boolean[];
  year: number;
  /** Zero-based month, like `Date`. */
  month: number;
  /** Day of the month today (1-based). The analysis assumes the month is running. */
  today: number;
  dailyValue: number;
  goal: number;
  money: (value: number) => string;
  /** Extra money from custom deposit amounts, added to the standard `marked days x daily value`. */
  savedExtra?: number;
};

const WEEKDAYS_PLURAL = ["domingos", "segundas", "terças", "quartas", "quintas", "sextas", "sábados"];
const MILESTONES = [25, 50, 75, 100];

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function computeInsights(input: InsightInput): Insight[] {
  const { completed, year, month, dailyValue, goal, money } = input;
  const days = completed.length;
  if (days === 0 || goal <= 0 || dailyValue <= 0) return [];

  const today = Math.min(Math.max(Math.trunc(input.today), 1), days);
  const done = completed.filter(Boolean).length;
  const saved = done * dailyValue + (input.savedExtra ?? 0);
  const remaining = Math.max(goal - saved, 0);
  const insights: Insight[] = [];

  // 1. Can the goal still be reached at this daily value?
  const needed = Math.ceil(remaining / dailyValue);
  const daysAfterToday = days - today;
  const todayOpen = completed[today - 1] ? 0 : 1;
  const available = daysAfterToday + todayOpen;

  if (remaining === 0) {
    insights.push({
      id: "goal",
      tone: "good",
      title: "Meta batida",
      text: `Você já guardou ${money(saved)}. Cada dia a mais é economia extra.`,
    });
  } else if (available === 0) {
    insights.push({
      id: "goal",
      tone: "warn",
      title: "Sem dias para a meta",
      text: `Não restam dias neste mês e ainda faltam ${money(remaining)}.`,
    });
  } else if (needed > available) {
    const suggested = Math.ceil(remaining / available);
    insights.push({
      id: "goal",
      tone: "warn",
      title: "Meta fora de alcance neste valor",
      text: `Faltam ${plural(needed, "depósito", "depósitos")} de ${money(dailyValue)}, mas só restam ${plural(available, "dia", "dias")}. Com ${money(suggested)} por dia ainda dá para fechar.`,
    });
  } else if (needed === available) {
    insights.push({
      id: "goal",
      tone: "warn",
      title: "Sem folga",
      text: `Para bater a meta, marque todos os ${plural(available, "dia restante", "dias restantes")}.`,
    });
  } else {
    const slack = available - needed;
    insights.push({
      id: "goal",
      tone: "good",
      title: "No ritmo da meta",
      text: `Faltam ${plural(needed, "depósito", "depósitos")} e restam ${plural(available, "dia", "dias")}: uma folga de ${plural(slack, "dia", "dias")}.`,
    });
  }

  // 2. Consistency so far this month.
  const marked = completed.slice(0, today).filter(Boolean).length;
  const pct = Math.round((marked / today) * 100);
  insights.push({
    id: "consistency",
    tone: pct >= 80 ? "good" : pct >= 50 ? "info" : "warn",
    title: `Consistência de ${pct}%`,
    text: `${marked} de ${plural(today, "dia", "dias")} marcados até hoje.`,
  });

  // 3. Days before today that were left unmarked.
  const missedBefore = completed.slice(0, today - 1).filter((c) => !c).length;
  if (missedBefore > 0) {
    insights.push({
      id: "missed",
      tone: "info",
      title: "Dias em atraso",
      text: `${plural(missedBefore, "dia anterior sem marcação", "dias anteriores sem marcação")}. Se você guardou nesses dias, marque para o total refletir a realidade.`,
    });
  }

  // 4. Weekday with the most deposits (only when there is a clear winner).
  if (done >= 4) {
    const byWeekday = new Array<number>(7).fill(0);
    completed.forEach((c, i) => {
      if (c) byWeekday[new Date(year, month, i + 1).getDay()]++;
    });
    const best = Math.max(...byWeekday);
    const winners = byWeekday.filter((n) => n === best).length;
    if (best >= 2 && winners === 1) {
      const idx = byWeekday.indexOf(best);
      insights.push({
        id: "weekday",
        tone: "info",
        title: `Você marca mais nas ${WEEKDAYS_PLURAL[idx]}`,
        text: `${best} dos seus ${done} depósitos do mês foram nesse dia da semana.`,
      });
    }
  }

  // 5. Distance to the next milestone.
  if (remaining > 0) {
    const progress = (saved / goal) * 100;
    const next = MILESTONES.find((m) => m > progress);
    if (next !== undefined && next < 100) {
      const deposits = Math.ceil((goal * (next / 100) - saved) / dailyValue);
      insights.push({
        id: "milestone",
        tone: "info",
        title: `Próximo marco: ${next}%`,
        text: `${plural(Math.max(deposits, 1), "depósito", "depósitos")} para chegar lá.`,
      });
    }
  }

  return insights;
}

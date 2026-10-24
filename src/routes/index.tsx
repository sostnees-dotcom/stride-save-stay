import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  Coins,
  Cpu,
  Moon,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sun,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Confetti } from "@/components/confetti";
import { InsightRow } from "@/components/insights-panel";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { applyTheme } from "@/lib/goal-data";
import { CURRENCIES, formatMoney } from "@/lib/goals";
import { computeInsights } from "@/lib/insights";
import { useAnimatedNumber } from "@/lib/use-animated-number";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Minha Meta Mensal — Desafio de 30 dias" },
      {
        name: "description",
        content:
          "Defina sua meta, marque cada depósito e acompanhe seu progresso mês a mês, com segurança.",
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
  component: Landing,
});

const NAV = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#recursos", label: "Recursos" },
  { href: "#simulador", label: "Simulador" },
  { href: "#analise", label: "Análise" },
  { href: "#perguntas", label: "Perguntas" },
];

const navLink =
  "rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (data.user) void navigate({ to: "/app", replace: true });
      })
      .catch(() => {});
  }, [navigate]);

  return (
    <div className="bg-page flex min-h-screen flex-col font-sans text-foreground">
      <div
        aria-hidden="true"
        className="scroll-progress bg-progress fixed inset-x-0 top-0 z-50 h-1"
      />

      <div className="px-4 pt-4 sm:px-8">
        <header className="glass shadow-card sticky top-3 z-40 mx-auto flex w-full max-w-6xl items-center justify-between gap-3 rounded-full border border-border py-2 pl-5 pr-2">
          <div className="flex items-center gap-2 text-primary">
            <Target className="size-5" strokeWidth={2.5} />
            <span className="font-display text-lg font-extrabold tracking-tight">
              Minha Meta Mensal
            </span>
          </div>
          <nav aria-label="Seções" className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className={navLink}>
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Link to="/auth">
              <Button className="rounded-full px-5 font-bold">Entrar</Button>
            </Link>
          </div>
        </header>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-8">
        {/* Hero */}
        <section className="grid items-center gap-12 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:py-24">
          <div>
            <h1
              className="rise font-display text-5xl font-extrabold leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl"
              style={{ animationDelay: "0ms" }}
            >
              Um dia de cada vez. Um objetivo cada vez mais perto.
            </h1>
            <p
              className="rise mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground"
              style={{ animationDelay: "120ms" }}
            >
              Defina quanto quer guardar no mês, marque cada depósito e veja seu
              progresso crescer, com seus dados protegidos na sua conta.
            </p>
            <div
              className="rise mt-9 flex flex-wrap items-center gap-3"
              style={{ animationDelay: "220ms" }}
            >
              <Link to="/auth">
                <Button className="h-12 rounded-full px-8 text-base font-bold shadow-card">
                  Começar agora
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <a href="#simulador" className={navLink + " inline-flex h-12 items-center px-5"}>
                Simular minha economia
              </a>
            </div>
          </div>

          <div className="rise" style={{ animationDelay: "320ms" }}>
            <ChallengeDemo />
          </div>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="scroll-mt-24 border-t border-border py-20">
          <h2 className="font-display max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            Três passos para o mês fechar no verde
          </h2>
          <ol className="relative mt-12 grid gap-10 md:grid-cols-3">
            <div
              aria-hidden="true"
              className="absolute left-0 right-0 top-6 hidden border-t-2 border-dashed border-border md:block"
            />
            <Step
              n="1"
              title="Defina a meta"
              text="Escolha quanto quer juntar no mês e quanto vai guardar por dia. A conta fecha sozinha."
            />
            <Step
              n="2"
              title="Marque cada depósito"
              text="Toque no dia no calendário assim que guardar. O toque aparece na hora e nunca se perde."
            />
            <Step
              n="3"
              title="Acompanhe e conquiste"
              text="Veja a barra de progresso, quanto falta e as conquistas que você desbloqueou pelo caminho."
            />
          </ol>
        </section>

        {/* Recursos (bento) */}
        <section id="recursos" className="scroll-mt-24 border-t border-border py-20">
          <h2 className="font-display max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            Tudo o que você precisa para manter o hábito
          </h2>
          <div className="@container mt-12">
            <div className="grid gap-4 @2xl:grid-cols-6">
              <BentoCell
                className="@2xl:col-span-3 @2xl:row-span-2"
                icon={<CalendarCheck2 className="size-5" />}
                title="Calendário real"
                text="Cada mês com seus dias certinhos, fins de semana e o dia de hoje em destaque."
              >
                <MiniCalendar />
              </BentoCell>
              <BentoCell
                className="@2xl:col-span-3"
                icon={<TrendingUp className="size-5" />}
                title="Progresso visível"
                text="Barra de progresso, marcos de 25% a 100% e quanto falta por dia."
              >
                <div aria-hidden="true" className="mt-5 h-2.5 overflow-hidden rounded-full bg-secondary">
                  <div className="bg-progress h-full w-2/3 rounded-full" />
                </div>
              </BentoCell>
              <BentoCell
                className="@2xl:col-span-3"
                icon={<Target className="size-5" />}
                title="Mais de uma meta"
                text="Além da meta principal, crie outras, como viagem, reserva ou presente, cada uma com seu valor diário."
              >
                <div aria-hidden="true" className="mt-5 flex flex-wrap gap-2">
                  {["Viagem", "Reserva", "Presente"].map((g) => (
                    <span
                      key={g}
                      className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </BentoCell>
              <BentoCell
                className="@2xl:col-span-2"
                icon={<Coins className="size-5" />}
                title="Real, dólar ou euro"
                text="Escolha a moeda nas configurações e os valores aparecem formatados do jeito certo."
              >
                <div aria-hidden="true" className="mt-5 flex gap-2">
                  {CURRENCIES.map((c) => (
                    <span
                      key={c.code}
                      className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary"
                    >
                      {c.symbol}
                    </span>
                  ))}
                </div>
              </BentoCell>
              <BentoCell
                className="@2xl:col-span-2"
                icon={<RefreshCw className="size-5" />}
                title="Nenhum toque se perde"
                text="Se a conexão falhar, o dia fica guardado no aparelho e é enviado de novo até a conta confirmar."
              />
              <BentoCell
                className="@2xl:col-span-2"
                icon={<Moon className="size-5" />}
                title="Tema claro ou escuro"
                text="Use o visual que for melhor para seus olhos. Experimente agora:"
              >
                <div className="mt-4">
                  <ThemeToggle labeled />
                </div>
              </BentoCell>
            </div>
          </div>
        </section>

        {/* Simulador */}
        <section
          id="simulador"
          className="grid scroll-mt-24 items-center gap-10 border-t border-border py-20 lg:grid-cols-[0.9fr_1.1fr]"
        >
          <div>
            <h2 className="font-display max-w-md text-4xl font-extrabold tracking-tight sm:text-5xl">
              Quanto dá para juntar guardando um pouco por dia?
            </h2>
            <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
              Arraste o valor diário e veja o total no mês e no ano. É só a soma
              dos seus depósitos, sem rendimento.
            </p>
          </div>
          <Simulator />
        </section>

        {/* Análise automática */}
        <section
          id="analise"
          className="grid scroll-mt-24 items-center gap-10 border-t border-border py-20 lg:grid-cols-[0.9fr_1.1fr]"
        >
          <div>
            <h2 className="font-display max-w-md text-4xl font-extrabold tracking-tight sm:text-5xl">
              Seu mês, explicado
            </h2>
            <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
              O app lê os dias que você marcou e calcula seu ritmo, o risco de
              não bater a meta e o próximo marco. É conta feita no próprio app,
              e atualiza a cada toque.
            </p>
          </div>
          <InsightsDemo />
        </section>

        {/* Conquistas */}
        <section
          aria-labelledby="conquistas-titulo"
          className="relative my-4 overflow-hidden rounded-[2rem] bg-primary px-6 py-14 text-primary-foreground sm:px-12"
        >
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-16 size-64 rounded-full bg-accent/30 blur-3xl"
          />
          <div className="relative">
            <div className="flex items-center gap-3">
              <Trophy className="size-7" />
              <h2
                id="conquistas-titulo"
                className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl"
              >
                Cada marco ganha uma conquista
              </h2>
            </div>
            <p className="mt-4 max-w-xl text-primary-foreground/80">
              Do primeiro depósito ao trimestre batendo a meta, o app reconhece o
              que você já construiu.
            </p>
            <ul className="mt-10 grid gap-x-10 gap-y-3 sm:grid-cols-2">
              {[
                ["Primeiro passo", "Marque seu primeiro depósito."],
                ["Semana firme", "Guarde 7 dias seguidos."],
                ["Quinzena de ferro", "Guarde 15 dias seguidos."],
                ["Mês perfeito", "Marque todos os dias de um mês."],
                ["Meta batida", "Alcance a meta em um mês."],
                ["Trimestre de ouro", "Alcance a meta em 3 meses."],
                ["Planos diversos", "Tenha mais de uma meta ativa."],
              ].map(([title, text]) => (
                <li
                  key={title}
                  className="flex items-start gap-3 border-t border-primary-foreground/20 pt-3"
                >
                  <Check className="mt-0.5 size-4 shrink-0" strokeWidth={3} />
                  <span>
                    <span className="font-semibold">{title}.</span>{" "}
                    <span className="text-primary-foreground/80">{text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Segurança + FAQ */}
        <section
          id="perguntas"
          className="grid scroll-mt-24 gap-10 py-20 lg:grid-cols-[0.8fr_1.2fr]"
        >
          <div>
            <div className="mb-4 grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
              Perguntas frequentes
            </h2>
            <p className="mt-4 max-w-sm text-muted-foreground">
              Entre com e-mail, Google ou Lovable. Seus dados ficam na sua
              conta, e ninguém mais vê seus depósitos.
            </p>
          </div>
          <Accordion type="single" collapsible className="w-full">
            <FaqItem
              value="todo-dia"
              q="Preciso guardar todos os dias?"
              a="Não. Você marca os dias em que guardou e acompanha quanto falta para a meta. Se pular um dia, ele só fica sem marcação."
            />
            <FaqItem
              value="meta"
              q="Posso mudar a meta e o valor diário?"
              a="Sim. Você ajusta a meta e o valor por dia direto no calendário, e a moeda nas configurações, quando quiser."
            />
            <FaqItem
              value="varias"
              q="Posso ter mais de uma meta ao mesmo tempo?"
              a="Pode. Além da meta principal, você cria outras, cada uma com seu próprio valor diário e seu próprio histórico."
            />
            <FaqItem
              value="meses"
              q="O que acontece quando o mês termina?"
              a="O mês fica salvo no histórico, e você começa o próximo do zero. Cada mês tem seus próprios dias marcados."
            />
            <FaqItem
              value="seguro"
              q="Meus dados ficam seguros?"
              a="Seus depósitos e metas ficam vinculados à sua conta, e só você consegue ver e alterar esses dados."
            />
          </Accordion>
        </section>

        {/* CTA final */}
        <section className="glow-border shadow-panel mb-16 rounded-[2rem] px-6 py-14 text-center sm:px-12">
          <h2 className="font-display mx-auto max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            Comece o mês de hoje com o primeiro dia marcado
          </h2>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            Crie sua conta, defina a meta e marque o primeiro depósito.
          </p>
          <Link to="/auth" className="mt-8 inline-block">
            <Button className="h-12 rounded-full px-8 text-base font-bold shadow-card">
              Criar minha conta
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </section>
      </main>

      <footer className="border-t border-border bg-card/60 px-4 py-10 sm:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2 text-primary">
              <Target className="size-5" strokeWidth={2.5} />
              <span className="font-display text-lg font-extrabold">Minha Meta Mensal</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Construa o hábito de guardar, um dia de cada vez.
            </p>
          </div>
          <nav aria-label="Rodapé" className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {n.label}
              </a>
            ))}
            <Link to="/auth" className="text-primary hover:underline">
              Entrar
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function ThemeToggle({ labeled = false }: { labeled?: boolean }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    try {
      applyTheme(next ? "dark" : "light");
    } catch {
      document.documentElement.classList.toggle("dark", next);
    }
    setDark(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Mudar para o tema claro" : "Mudar para o tema escuro"}
      className={
        "inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-secondary text-sm font-semibold text-secondary-foreground transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
        (labeled ? "px-4 py-2" : "size-9 justify-center")
      }
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      {labeled ? (dark ? "Tema claro" : "Tema escuro") : null}
    </button>
  );
}

function BentoCell({
  className = "",
  icon,
  title,
  text,
  children,
}: {
  className?: string;
  icon: ReactNode;
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={
        "reveal flex flex-col rounded-3xl border border-border bg-card p-6 shadow-card transition-colors hover:border-primary/40 " +
        className
      }
    >
      <div className="mb-4 grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="font-display text-xl font-extrabold tracking-tight">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
      {children}
    </div>
  );
}

function MiniCalendar() {
  // Decorative: a month grid with the first stretch of days already marked.
  return (
    <div aria-hidden="true" className="mt-6 grid max-w-sm grid-cols-7 gap-1.5">
      {Array.from({ length: 35 }, (_, i) => {
        const day = i + 1;
        const done = day <= 18 && day % 6 !== 0;
        const today = day === 19;
        return (
          <div
            key={i}
            className={
              "grid aspect-square place-items-center rounded-lg text-[11px] font-bold tabular-nums " +
              (day > 31
                ? "invisible "
                : "") +
              (done
                ? "bg-primary text-primary-foreground"
                : today
                  ? "border-2 border-accent bg-card text-foreground"
                  : "bg-secondary text-muted-foreground")
            }
          >
            {day <= 31 ? day : ""}
          </div>
        );
      })}
    </div>
  );
}

const DEMO_DAYS = 30;
const DEMO_START = 11;
const DEMO_VALUES = [10, 20, 50];

function Simulator() {
  const [daily, setDaily] = useState(15);
  const month = useAnimatedNumber(daily * 30);
  const year = useAnimatedNumber(daily * 365);
  const daysToThousand = Math.ceil(1000 / daily);

  return (
    <div className="shadow-panel rounded-3xl border border-border bg-card p-6 sm:p-8">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor="simulador-valor" className="text-sm font-semibold text-muted-foreground">
          Valor guardado por dia
        </label>
        <output
          id="simulador-valor"
          className="font-display text-4xl font-extrabold tabular-nums tracking-tight"
        >
          {formatMoney(daily)}
        </output>
      </div>
      <Slider
        className="mt-6"
        min={1}
        max={100}
        step={1}
        value={[daily]}
        onValueChange={(v) => setDaily(v[0] ?? 1)}
        aria-label="Valor guardado por dia"
      />
      <div className="mt-2 flex justify-between text-[11px] font-semibold tabular-nums text-muted-foreground">
        <span>{formatMoney(1)}</span>
        <span>{formatMoney(100)}</span>
      </div>

      <dl className="mt-7 grid grid-cols-2 gap-4 border-t border-border pt-6">
        <div>
          <dt className="text-sm text-muted-foreground">Em 30 dias</dt>
          <dd className="font-display text-3xl font-extrabold tabular-nums tracking-tight">
            {formatMoney(Math.round(month))}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Em 1 ano</dt>
          <dd className="font-display text-3xl font-extrabold tabular-nums tracking-tight">
            {formatMoney(Math.round(year))}
          </dd>
        </div>
      </dl>
      <p className="mt-5 text-sm text-muted-foreground" aria-live="polite">
        {daysToThousand === 1
          ? `Você chega a ${formatMoney(1000)} em 1 dia.`
          : `Você chega a ${formatMoney(1000)} em ${daysToThousand} dias.`}
      </p>
    </div>
  );
}

function ChallengeDemo() {
  const [daily, setDaily] = useState(20);
  const [done, setDone] = useState<boolean[]>(() =>
    Array.from({ length: DEMO_DAYS }, (_, i) => i < DEMO_START),
  );
  const goal = DEMO_DAYS * daily;
  const count = done.filter(Boolean).length;
  const saved = count * daily;
  const animatedSaved = useAnimatedNumber(saved);
  const pct = Math.round((saved / goal) * 100);
  const remaining = DEMO_DAYS - count;

  const toggle = (i: number) =>
    setDone((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  const reset = () => setDone(Array.from({ length: DEMO_DAYS }, (_, i) => i < DEMO_START));

  return (
    <div className="glow-border shadow-panel relative overflow-hidden rounded-3xl p-5 sm:p-7">
      {remaining === 0 && <Confetti count={16} />}

      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Guardado neste desafio</p>
          <p className="font-display text-5xl font-extrabold tabular-nums tracking-tight">
            {formatMoney(Math.round(animatedSaved))}
          </p>
        </div>
        <p className="pb-1.5 text-right text-sm text-muted-foreground">
          meta de {formatMoney(goal)}
        </p>
      </div>

      <div
        role="group"
        aria-label="Valor por dia no exemplo"
        className="mt-4 flex flex-wrap items-center gap-2"
      >
        <span className="text-sm text-muted-foreground">Por dia:</span>
        {DEMO_VALUES.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={daily === v}
            onClick={() => setDaily(v)}
            className={
              "cursor-pointer rounded-full border px-3 py-1 text-sm font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
              (daily === v
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-secondary text-secondary-foreground hover:bg-primary/15")
            }
          >
            {formatMoney(v)}
          </button>
        ))}
      </div>

      <div
        role="progressbar"
        aria-label="Progresso da meta"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="mt-5 h-3 overflow-hidden rounded-full bg-secondary"
      >
        <div
          className="bg-progress h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] font-semibold tabular-nums text-muted-foreground">
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>

      <div className="mt-5 grid grid-cols-6 gap-2">
        {done.map((isDone, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={isDone}
            aria-label={`Dia ${i + 1}`}
            onClick={() => toggle(i)}
            className={
              "grid aspect-square cursor-pointer place-items-center rounded-xl text-sm font-bold tabular-nums transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-90 " +
              (isDone
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-secondary-foreground hover:bg-primary/15")
            }
          >
            {isDone ? <Check className="size-4" strokeWidth={3} /> : i + 1}
          </button>
        ))}
      </div>

      <div className="mt-5 flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {remaining === 0
            ? "Meta batida! Todos os dias foram marcados."
            : `${count} de ${DEMO_DAYS} dias marcados, faltam ${remaining}. Toque nos dias para testar.`}
        </p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RotateCcw className="size-3.5" />
          Reiniciar
        </button>
      </div>
    </div>
  );
}

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

const INSIGHT_SCENARIOS = [
  { id: "ritmo", label: "No ritmo", marked: [...range(1, 5), ...range(7, 19)], today: 19 },
  { id: "atraso", label: "Atrasado", marked: [1, 2, 3, 5, 8, 9], today: 19 },
  { id: "meta", label: "Meta batida", marked: range(1, 25), today: 26 },
] as const;

function InsightsDemo() {
  const [scenarioId, setScenarioId] = useState<(typeof INSIGHT_SCENARIOS)[number]["id"]>("ritmo");
  const scenario = INSIGHT_SCENARIOS.find((s) => s.id === scenarioId) ?? INSIGHT_SCENARIOS[0];

  const insights = useMemo(
    () =>
      computeInsights({
        completed: Array.from({ length: 31 }, (_, i) => scenario.marked.some((d) => d === i + 1)),
        year: 2026,
        month: 9,
        today: scenario.today,
        dailyValue: 20,
        goal: 500,
        money: (v) => formatMoney(v),
      }),
    [scenario],
  );

  return (
    <div className="scan shadow-panel relative overflow-hidden rounded-3xl border border-primary/30 bg-card p-5 sm:p-7">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
          <Cpu className="size-5" />
        </span>
        <p className="text-lg font-bold">Análise automática</p>
        <span className="ml-auto text-xs font-semibold text-muted-foreground">Exemplo</span>
      </div>

      <div role="group" aria-label="Cenário do exemplo" className="mt-4 flex flex-wrap gap-2">
        {INSIGHT_SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={scenarioId === s.id}
            onClick={() => setScenarioId(s.id)}
            className={
              "cursor-pointer rounded-full border px-3 py-1 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
              (scenarioId === s.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-secondary text-secondary-foreground hover:bg-primary/15")
            }
          >
            {s.label}
          </button>
        ))}
      </div>

      <div aria-hidden="true" className="mt-4 flex flex-wrap gap-1">
        {Array.from({ length: 31 }, (_, i) => (
          <span
            key={i}
            className={
              "size-3.5 rounded-full " +
              (scenario.marked.some((d) => d === i + 1)
                ? "bg-primary"
                : i + 1 === scenario.today
                  ? "border-2 border-accent"
                  : "bg-secondary")
            }
          />
        ))}
      </div>

      <ul key={scenarioId} className="mt-5 grid gap-3">
        {insights.map((item, i) => (
          <InsightRow key={item.id} item={item} delay={i * 90} />
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">
        Exemplo com meta de {formatMoney(500)} e {formatMoney(20)} por dia.
      </p>
    </div>
  );
}

function Step({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <li className="reveal relative">
      <span
        aria-hidden="true"
        className="font-display relative grid size-12 place-items-center rounded-full border-2 border-primary bg-background text-xl font-extrabold text-primary"
      >
        {n}
      </span>
      <h3 className="font-display mt-5 text-2xl font-extrabold tracking-tight">{title}</h3>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{text}</p>
    </li>
  );
}

function FaqItem({ value, q, a }: { value: string; q: string; a: string }) {
  return (
    <AccordionItem value={value}>
      <AccordionTrigger className="text-left text-base font-semibold">{q}</AccordionTrigger>
      <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
    </AccordionItem>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  Coins,
  Moon,
  RefreshCw,
  ShieldCheck,
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
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/goals";

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
    <div className="bg-page flex min-h-screen flex-col px-4 py-6 font-sans text-foreground sm:px-8">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between border-b border-border pb-5">
        <div className="flex items-center gap-2 text-primary">
          <Target className="size-5" strokeWidth={2.5} />
          <span className="font-display text-lg font-semibold">Minha Meta Mensal</span>
        </div>
        <nav aria-label="Seções" className="flex items-center gap-1 sm:gap-2">
          <a
            href="#como-funciona"
            className="hidden rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:inline-block"
          >
            Como funciona
          </a>
          <a
            href="#recursos"
            className="hidden rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:inline-block"
          >
            Recursos
          </a>
          <a
            href="#perguntas"
            className="hidden rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:inline-block"
          >
            Perguntas
          </a>
          <Link to="/auth">
            <Button variant="outline" className="border-border bg-card font-semibold">
              Entrar
            </Button>
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1">
        {/* Hero */}
        <section className="grid items-center gap-10 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:py-20">
          <div>
            <h1 className="font-display max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Um dia de cada vez. Um objetivo cada vez mais perto.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
              Defina quanto quer guardar no mês, marque cada depósito e veja seu
              progresso crescer, com seus dados protegidos na sua conta.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/auth">
                <Button className="h-12 px-7 text-base font-bold">
                  Começar agora
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <a
                href="#como-funciona"
                className="rounded-md px-3 py-2 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                Ver como funciona
              </a>
            </div>
          </div>

          <ChallengeDemo />
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="scroll-mt-8 border-t border-border py-16">
          <h2 className="font-display max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Três passos para o mês fechar no verde
          </h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
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

        {/* Recursos */}
        <section id="recursos" className="scroll-mt-8 border-t border-border py-16">
          <h2 className="font-display max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Tudo o que você precisa para manter o hábito
          </h2>
          <div className="mt-10 grid gap-x-12 gap-y-8 sm:grid-cols-2">
            <Feature
              icon={<CalendarCheck2 className="size-5" />}
              title="Calendário real"
              text="Cada mês com seus dias certinhos, fins de semana e o dia de hoje em destaque."
            />
            <Feature
              icon={<TrendingUp className="size-5" />}
              title="Progresso visível"
              text="Barra de progresso, marcos de 25% a 100% e quanto falta por dia."
            />
            <Feature
              icon={<Target className="size-5" />}
              title="Mais de uma meta"
              text="Além da meta principal, crie outras, como viagem, reserva ou presente, cada uma com seu valor diário."
            />
            <Feature
              icon={<Coins className="size-5" />}
              title="Real, dólar ou euro"
              text="Escolha a moeda nas configurações e os valores aparecem formatados do jeito certo."
            />
            <Feature
              icon={<RefreshCw className="size-5" />}
              title="Nenhum toque se perde"
              text="Se a conexão falhar, o dia fica guardado no aparelho e é enviado de novo até a conta confirmar."
            />
            <Feature
              icon={<Moon className="size-5" />}
              title="Tema claro ou escuro"
              text="Use o visual que for melhor para seus olhos, ou deixe seguir o do seu aparelho."
            />
          </div>
        </section>

        {/* Conquistas */}
        <section
          aria-labelledby="conquistas-titulo"
          className="my-4 rounded-2xl bg-primary px-6 py-12 text-primary-foreground sm:px-12"
        >
          <div className="flex items-center gap-3">
            <Trophy className="size-6" />
            <h2
              id="conquistas-titulo"
              className="font-display text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              Cada marco ganha uma conquista
            </h2>
          </div>
          <p className="mt-3 max-w-xl text-primary-foreground/80">
            Do primeiro depósito ao trimestre batendo a meta, o app reconhece o
            que você já construiu.
          </p>
          <ul className="mt-8 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {[
              ["Primeiro passo", "Marque seu primeiro depósito."],
              ["Semana firme", "Guarde 7 dias seguidos."],
              ["Quinzena de ferro", "Guarde 15 dias seguidos."],
              ["Mês perfeito", "Marque todos os dias de um mês."],
              ["Meta batida", "Alcance a meta em um mês."],
              ["Trimestre de ouro", "Alcance a meta em 3 meses."],
              ["Planos diversos", "Tenha mais de uma meta ativa."],
            ].map(([title, text]) => (
              <li key={title} className="flex items-start gap-3 border-t border-primary-foreground/20 pt-3">
                <Check className="mt-0.5 size-4 shrink-0" strokeWidth={3} />
                <span>
                  <span className="font-semibold">{title}.</span>{" "}
                  <span className="text-primary-foreground/80">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Segurança + FAQ */}
        <section id="perguntas" className="scroll-mt-8 grid gap-10 py-16 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <div className="mb-4 grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Perguntas frequentes
            </h2>
            <p className="mt-3 max-w-sm text-muted-foreground">
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
        <section className="mb-8 rounded-2xl border border-border bg-card px-6 py-12 text-center shadow-panel sm:px-12">
          <h2 className="font-display mx-auto max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Comece o mês de hoje com o primeiro dia marcado
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Crie sua conta, defina a meta e marque o primeiro depósito.
          </p>
          <Link to="/auth" className="mt-7 inline-block">
            <Button className="h-12 px-7 text-base font-bold">
              Criar minha conta
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-5xl border-t border-border pt-5 text-center text-xs text-muted-foreground">
        Minha Meta Mensal. Construa o hábito de guardar.
      </footer>
    </div>
  );
}

const DEMO_DAYS = 30;
const DEMO_DAILY = 20;
const DEMO_GOAL = DEMO_DAYS * DEMO_DAILY;

function ChallengeDemo() {
  const [done, setDone] = useState<boolean[]>(() =>
    Array.from({ length: DEMO_DAYS }, (_, i) => i < 11),
  );
  const count = done.filter(Boolean).length;
  const saved = count * DEMO_DAILY;
  const pct = Math.round((saved / DEMO_GOAL) * 100);
  const remaining = DEMO_DAYS - count;

  const toggle = (i: number) =>
    setDone((prev) => prev.map((v, idx) => (idx === i ? !v : v)));

  return (
    <div className="shadow-panel rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Guardado neste desafio</p>
          <p className="font-display text-4xl font-semibold tabular-nums tracking-tight">
            {formatMoney(saved)}
          </p>
        </div>
        <p className="pb-1 text-right text-sm text-muted-foreground">
          meta de {formatMoney(DEMO_GOAL)}
        </p>
      </div>

      <div
        role="progressbar"
        aria-label="Progresso da meta"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="mt-4 h-3 overflow-hidden rounded-full bg-secondary"
      >
        <div
          className="bg-progress h-full rounded-full transition-[width] duration-300 ease-out"
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
              "grid aspect-square cursor-pointer place-items-center rounded-lg text-sm font-bold tabular-nums transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-90 " +
              (isDone
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-primary/15")
            }
          >
            {isDone ? <Check className="size-4" strokeWidth={3} /> : i + 1}
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
        {remaining === 0
          ? "Meta batida! Todos os dias foram marcados."
          : `${count} de ${DEMO_DAYS} dias marcados, faltam ${remaining}. Toque nos dias para testar.`}
      </p>
    </div>
  );
}

function Step({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <li className="flex gap-4">
      <span
        aria-hidden="true"
        className="font-display text-5xl font-semibold leading-none text-primary/30"
      >
        {n}
      </span>
      <div>
        <h3 className="font-display text-xl font-semibold">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
      </div>
    </li>
  );
}

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-4 border-t border-border pt-5">
      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
      </div>
    </div>
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
